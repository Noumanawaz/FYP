import json
import asyncio
import re
import psycopg2
import os
import uuid
import math
from typing import Dict, Any, List, Optional
from services.neon_vector_store import _get_conn

class OrderHandler:
    def __init__(self, llm_service, rag_system):
        self.llm_service = llm_service
        self.rag_system = rag_system
        self.order_context = {}  # {session_id: {"items": [], "restaurant_id": str, ...}}
        self.DEFAULT_RADIUS_KM = 15.0

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        if None in [lat1, lon1, lat2, lon2]: return 999.0
        try:
            R = 6371.0
            dLat = math.radians(float(lat2) - float(lat1))
            dLon = math.radians(float(lon2) - float(lon1))
            a = math.sin(dLat / 2) * math.sin(dLat / 2) + \
                math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
                math.sin(dLon / 2) * math.sin(dLon / 2)
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c
        except: return 999.0

    async def _fetch_user_info(self, session_id: str) -> Dict[str, Any]:
        user_info = {"phone": None, "address": None, "lat": None, "lng": None}
        try:
            if len(session_id) >= 32:
                conn = _get_conn()
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT phone, addresses FROM users WHERE user_id = %s", (session_id,))
                        row = cur.fetchone()
                        if row:
                            user_info["phone"] = row[0]
                            if row[1] and isinstance(row[1], list) and len(row[1]) > 0:
                                addr_obj = row[1][0]
                                if isinstance(addr_obj, dict):
                                    user_info["address"] = addr_obj.get("address")
                                    user_info["lat"] = addr_obj.get("lat")
                                    user_info["lng"] = addr_obj.get("lng")
                                else:
                                    user_info["address"] = str(addr_obj)
                conn.close()
        except Exception as e:
            print(f"⚠️ Error fetching user info: {e}")
        return user_info

    async def _check_restaurant_availability(self, restaurant_id: str, user_lat: Optional[float], user_lng: Optional[float]) -> Dict[str, Any]:
        if not user_lat or not user_lng:
            return {"available": True, "location_id": None}
        try:
            conn = _get_conn()
            with conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT location_id, lat, lng FROM restaurant_locations WHERE restaurant_id = %s AND status = 'open'", (restaurant_id,))
                    locations = cur.fetchall()
                    best_loc = None
                    min_dist = float('inf')
                    for loc_id, lat, lng in locations:
                        if lat is not None and lng is not None:
                            dist = self._haversine_distance(user_lat, user_lng, lat, lng)
                            if dist < min_dist:
                                min_dist = dist
                                best_loc = loc_id
            conn.close()
            if best_loc and min_dist <= self.DEFAULT_RADIUS_KM:
                return {"available": True, "location_id": best_loc}
            return {"available": False}
        except Exception as e:
            print(f"⚠️ Radius check failed: {e}")
            return {"available": True, "location_id": None}

    async def handle(self, query: str, history: list = None, summary: str = "", session_id: str = "default") -> Dict[str, Any]:
        if session_id not in self.order_context:
            user_info = await self._fetch_user_info(session_id)
            self.order_context[session_id] = {
                "items": [], "restaurant_id": None, "restaurant_name": "Assistant",
                "location_id": None, "phone": user_info.get("phone"),
                "address": user_info.get("address"), "lat": user_info.get("lat"), 
                "lng": user_info.get("lng"), "confirmed": False
            }
        
        ctx = self.order_context[session_id]
        
        # 1. Advanced Context Detection
        detected_res = self.rag_system.detect_restaurants_in_query(query)
        if not detected_res and summary:
            detected_res = self.rag_system.detect_restaurants_in_query(summary)
            
        if detected_res:
            new_rid = detected_res[0]["id"]
            if not ctx["restaurant_id"] or not ctx["items"]:
                ctx["restaurant_id"] = new_rid
                ctx["restaurant_name"] = detected_res[0]["name"]

        target_ids = [ctx["restaurant_id"]] if ctx["restaurant_id"] else None
        rag_info = await asyncio.to_thread(self.rag_system.search_comprehensive_info, query, target_ids)
        menu_context = self.rag_system.build_comprehensive_context(rag_info)
        
        # 2. Extract Intent
        extraction_prompt = f"""
        Analyze logic for {ctx['restaurant_name']}.
        CART: {json.dumps(ctx['items'])}
        SUMMARY: {summary}
        MENU CONTEXT: {menu_context}
        QUERY: "{query}"
        
        JSON: {{"intent": str, "items": list, "phone": str, "address": str, "suggestion": str, "error": str}}
        Intents: ["add_item", "remove_item", "view_cart", "confirm_order", "set_info", "question"]
        
        RULES:
        1. Match items against the MENU CONTEXT to find the correct "name", "price", and "item_id".
        2. If names are in Roman Urdu, match them to the closest menu item in the "MENU CONTEXT".
        3. "items" should be a list of objects: {{"name": str, "quantity": int, "item_id": str, "price": float}}
        4. Even if an item is not explicitly in "MENU CONTEXT" but the user wants to order it based on previous conversation, add it with price if known.
        5. If query is vague like "yes do it" or "confirm kar do" and summary/cart suggests they want to finish, use "confirm_order".
        6. Use "question" if it's just a general inquiry.
        """
        
        extraction_raw = await self.llm_service._call_openai_async([{"role": "user", "content": extraction_prompt}], response_format={"type": "json_object"})
        extraction = json.loads(extraction_raw) if extraction_raw else {}
        intent = extraction.get("intent", "question")
        
        if extraction.get("phone"): ctx["phone"] = extraction["phone"]
        if extraction.get("address"): ctx["address"] = extraction["address"]
        
        res_en = ""
        res_type = "order_action"

        # 3. Process Intent
        if intent == "add_item":
            new_items = extraction.get("items", [])
            safe_added = []
            for item in new_items:
                if isinstance(item, dict):
                    # STRICT VERSION: Only items found in the database (with valid UUID item_id) can be added.
                    item_id = item.get("item_id")
                    if item_id and len(item_id) >= 32:
                        safe_added.append({
                            "name": item.get("name", "Item"),
                            "quantity": int(item.get("quantity", 1)),
                            "price": float(item.get("price", 0)),
                            "item_id": item_id
                        })
            
            if safe_added:
                ctx["items"].extend(safe_added)
                res_en = f"Okay, I've added {', '.join([i['name'] for i in safe_added])} to your {ctx['restaurant_name']} cart. Should I confirm?"
            else:
                res_en = f"I'm sorry, I couldn't find those specific items in the {ctx['restaurant_name']} menu. Would you like to hear the options?"
                res_type = "error"
        
        elif intent == "confirm_order":
            if not ctx["items"]:
                res_en = "Your cart is empty."
            elif not ctx["phone"] or not ctx["address"]:
                res_en = "I need your phone and delivery address to complete the order."
            else:
                avail = await self._check_restaurant_availability(ctx["restaurant_id"], ctx["lat"], ctx["lng"])
                if not avail["available"]:
                    res_en = f"I'm sorry, {ctx['restaurant_name']} is too far for delivery."
                    res_type = "error"
                else:
                    ctx["location_id"] = avail["location_id"]
                    if await self._save_order_to_db(ctx, session_id):
                        res_en = f"Success! Your order from {ctx['restaurant_name']} has been placed."
                        self.order_context[session_id].update({"items": [], "confirmed": True, "restaurant_id": None})
                    else:
                        res_en = "Database error while placing your order. Please try again."

        elif intent == "view_cart":
            if not ctx["items"]: res_en = "Cart is empty."
            else: res_en = f"In your {ctx['restaurant_name']} cart: " + ", ".join([f"{i['quantity']}x {i['name']}" for i in ctx["items"]])
        
        else:
            # Fallback for questions or general chat
            dual = await self.llm_service.generate_dual_response(
                user_message=query,
                context=f"Restaurant: {ctx['restaurant_name']}. Cart: {json.dumps(ctx['items'])}. Menu: {menu_context}\n\nINSTRUCTION: You are a VOICE ORDERING AGENT. If the customer wants to order, you CAN add items for them. Just ask them what they want.",
                conversation_history=history
            )
            return {
                "response": dual['en'], "response_en": dual['en'], "response_ur": dual['ur'],
                "response_type": "order_agent_chat", "cart": ctx["items"], "restaurant_name": ctx["restaurant_name"],
                "confidence": 1.0, "suggestions": ["Confirm Order", "View Cart"]
            }

        dual = await self.llm_service.generate_dual_response(
            user_message=f"System Action: {intent}. Summary: {res_en}",
            context=f"Restaurant: {ctx['restaurant_name']}. Cart: {json.dumps(ctx['items'])}. Menu: {menu_context}",
            conversation_history=history
        )
        
        return {
            "response": dual['en'], "response_en": dual['en'], "response_ur": dual['ur'],
            "response_type": res_type, "cart": ctx["items"], "restaurant_name": ctx["restaurant_name"],
            "confidence": 1.0, "suggestions": ["Check my cart", "Confirm order"]
        }

    async def _save_order_to_db(self, ctx: dict, session_id: str) -> bool:
        try:
            conn = _get_conn()
            with conn:
                with conn.cursor() as cur:
                    user_id = session_id if len(session_id) >= 32 else None
                    subtotal = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in ctx["items"])
                    total_amt = subtotal * 1.15 + 100
                    order_id = str(uuid.uuid4())
                    
                    loc_id = ctx.get("location_id")
                    if not loc_id:
                        cur.execute("SELECT location_id FROM restaurant_locations WHERE restaurant_id = %s LIMIT 1", (ctx["restaurant_id"],))
                        row = cur.fetchone()
                        loc_id = row[0] if row else None
                    if not loc_id: return False

                    filtered_items = []
                    for it in ctx["items"]:
                        filtered_items.append({"name": it["name"], "quantity": it["quantity"], "price": it["price"]})

                    cur.execute("""
                        INSERT INTO orders (order_id, user_id, restaurant_id, location_id, order_type, order_status, items, subtotal, tax_amount, delivery_fee, total_amount, delivery_address, phone, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, 'voice', 'pending', %s, %s, %s, 100, %s, %s, %s, NOW(), NOW())
                    """, (order_id, user_id, ctx["restaurant_id"], loc_id, json.dumps(filtered_items), subtotal, subtotal*0.15, total_amt, ctx["address"], ctx["phone"]))
                    
                    for item in ctx["items"]:
                        item_id = item.get("item_id")
                        if item_id and len(item_id) >= 32:
                            try:
                                uuid.UUID(item_id)
                                cur.execute("INSERT INTO order_items (order_item_id, order_id, menu_item_id, quantity, unit_price, subtotal) VALUES (%s, %s, %s, %s, %s, %s)",
                                    (str(uuid.uuid4()), order_id, item_id, item["quantity"], item["price"], item["price"]*item["quantity"]))
                            except: pass
            conn.close()
            print(f"✅ DB ORDER SAVED: {order_id}")
            return True
        except Exception as e:
            print(f"❌ DB ERROR: {e}")
            return False

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
        query_lower = query.lower()
        
        # Detect from live query first (highest priority)
        detected_res = self.rag_system.detect_restaurants_in_query(query)
        
        # Check if user is explicitly switching restaurant 
        is_switch = any(phrase in query_lower for phrase in [
            'koi aur', 'kuchh aur', 'kisi aur', 'dusre', 'dusre restaurant', 'doosra',
            'other', 'another', 'different', 'change', 'chijen', 'cheez', 'cheezious'
        ])
        
        # If no restaurant in live query, look in recent history first (then summary)
        if not detected_res and history:
            # Scan history from most recent to find last explicit restaurant switch
            for msg in reversed(history[-6:]):
                if msg.get('role') == 'user':
                    hist_res = self.rag_system.detect_restaurants_in_query(msg['content'])
                    if hist_res and hist_res[0].get('detection_type') in ['explicit', 'explicit_and_category']:
                        detected_res = hist_res
                        print(f"📜 [OrderHandler] Using restaurant from recent history: {hist_res[0]['name']}")
                        break
        
        # Fallback to summary only if no history hit
        if not detected_res and summary and not is_switch:
            detected_res = self.rag_system.detect_restaurants_in_query(summary)
            if detected_res:
                print(f"📋 [OrderHandler] Using restaurant from summary: {detected_res[0]['name']}")
            
        if detected_res:
            new_rid = detected_res[0]["id"]
            new_name = detected_res[0]["name"]
            if not ctx["restaurant_id"]:
                # No restaurant yet, just set it
                ctx["restaurant_id"] = new_rid
                ctx["restaurant_name"] = new_name
            elif ctx["restaurant_id"] != new_rid:
                # User is switching restaurants!
                # Only switch if the query explicitly names a new restaurant (explicit detection)
                if detected_res[0].get("detection_type") in ["explicit", "explicit_and_category"]:
                    if ctx["items"]:
                        print(f"🔄 Restaurant switch: {ctx['restaurant_name']} -> {new_name}. Clearing cart.")
                        ctx["items"] = []  # Clear the old cart
                    ctx["restaurant_id"] = new_rid
                    ctx["restaurant_name"] = new_name

        target_ids = [ctx["restaurant_id"]] if ctx["restaurant_id"] else None
        rag_info = await asyncio.to_thread(self.rag_system.search_comprehensive_info, query, target_ids)
        menu_context = self.rag_system.build_comprehensive_context(rag_info)
        
        # 2. Extract Intent with History Memory
        history_msgs = ""
        if history:
            history_msgs = "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])

        extraction_prompt = f"""You are an order extractor for {ctx['restaurant_name']}.
        Extract the user's intent and order details.
        
        CURRENT RESTAURANT: {ctx['restaurant_name']}
        CURRENT CART: {json.dumps(ctx['items'])}
        
        MENU CONTEXT FOR {ctx['restaurant_name']} (ONLY ADD ITEMS FROM HERE):
        {menu_context}
        
        RECENT CONVERSATION HISTORY:
        {history_msgs}
        
        SUMMARY: {summary}
        USER QUERY: "{query}"
        
        JSON FORMAT: {{"intent": str, "items": list, "remove_items": list, "phone": str, "address": str, "suggestion": str, "error": str}}
        Intents: ["add_item", "remove_item", "update_item", "view_cart", "clear_cart", "confirm_order", "set_info", "question"]
        
        STRICT RULES:
        1. "add_item": ONLY extract items that appear in MENU CONTEXT above with a valid Item ID (UUID). Each item must have: name, quantity, price, item_id.
        2. CRITICAL: If an item is in the HISTORY or SUMMARY but NOT in MENU CONTEXT with a UUID, DO NOT add it. Return intent="question" with error="Item not found in menu".
        3. "remove_item": Provide a list of item names or 'item_id' to remove.
        4. "confirm_order": User wants to finalize/confirm their current cart.
        5. HISTORY RESOLUTION: If user says "yes", "han", "kar do" and history shows a suggestion, find that item in MENU CONTEXT. If found with a UUID → add_item. If not found → question with error.
        6. NEVER add items based only on history or summary — they MUST be in MENU CONTEXT also.
        """
        
        messages = [
            {"role": "system", "content": "You are a specialized order extractor."},
            {"role": "user", "content": extraction_prompt}
        ]
        
        extraction_raw = await self.llm_service._call_openai_async(messages, response_format={"type": "json_object"})
        extraction = json.loads(extraction_raw) if extraction_raw else {}
        intent = extraction.get("intent", "question")
        
        if extraction.get("phone"): ctx["phone"] = extraction["phone"]
        if extraction.get("address"): ctx["address"] = extraction["address"]
        
        res_en = ""
        res_type = "order_action"

        # 3. Process Intents
        if intent == "add_item":
            new_items = extraction.get("items", [])
            safe_added = []
            for item in new_items:
                if isinstance(item, dict):
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
                res_en = f"I've added {', '.join([i['name'] for i in safe_added])} to your {ctx['restaurant_name']} cart. Anything else, or should I confirm?"
            else:
                res_en = f"I couldn't find those specific items in the {ctx['restaurant_name']} menu. Would you like to try the options?"
                res_type = "error"
        
        elif intent == "remove_item":
            to_remove = extraction.get("remove_items", [])
            new_cart = []
            removed = []
            for item in ctx["items"]:
                rem = False
                for r in to_remove:
                    if isinstance(r, str) and (r.lower() in item["name"].lower() or r == item.get("item_id")):
                        rem = True
                        break
                if not rem: new_cart.append(item)
                else: removed.append(item["name"])
            
            ctx["items"] = new_cart
            if removed: res_en = f"Removed {', '.join(removed)} from your cart. Current cart: {self._cart_to_string(ctx['items'])}."
            else: res_en = f"I couldn't find those to remove. Cart has: {self._cart_to_string(ctx['items'])}."

        elif intent == "update_item":
            updates = extraction.get("items", [])
            upd = False
            for u in updates:
                for item in ctx["items"]:
                    if item.get("item_id") == u.get("item_id") or u.get("name", "").lower() in item["name"].lower():
                        item["quantity"] = int(u.get("quantity", item["quantity"]))
                        upd = True
            if upd: res_en = f"Updated your cart. Now: {self._cart_to_string(ctx['items'])}."
            else: res_en = "I couldn't find that item in your cart."

        elif intent == "clear_cart":
            ctx["items"] = []
            res_en = f"I've cleared your {ctx['restaurant_name']} cart."

        elif intent == "view_cart":
            if not ctx["items"]: res_en = "Your cart is currently empty."
            else: res_en = f"In your {ctx['restaurant_name']} cart: {self._cart_to_string(ctx['items'])}. Shall I confirm?"

        elif intent == "confirm_order":
            if not ctx["items"]:
                res_en = f"Your cart is empty. What would you like to add from {ctx['restaurant_name']}?"
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
            conn = neon_vector_store._get_conn()
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

                    cur.execute(
                        "INSERT INTO orders (order_id, user_id, restaurant_id, items, total_amount, status, created_at, phone, delivery_address, location_id) VALUES (%s, %s, %s, %s, %s, 'pending', NOW(), %s, %s, %s)",
                        (order_id, user_id, ctx["restaurant_id"], json.dumps(filtered_items), total_amt, ctx["phone"], ctx["address"], loc_id)
                    )

                    for item in ctx["items"]:
                        item_id = item.get("item_id")
                        if item_id and len(item_id) >= 32:
                            cur.execute(
                                "INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (%s, %s, %s, %s)",
                                (order_id, item_id, item["quantity"], item["price"])
                            )
                    return True
        except Exception as e:
            print(f"❌ DB Error: {e}")
            return False

    def _cart_to_string(self, items: List[dict]) -> str:
        if not items: return "nothing"
        return ", ".join([f"{i['quantity']}x {i['name']}" for i in items])

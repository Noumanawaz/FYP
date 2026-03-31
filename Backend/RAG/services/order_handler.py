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

    async def _fetch_user_info(self, user_id: str) -> Dict[str, Any]:
        """Fetch user profile details (phone, address, coords) from DB using user_id."""
        user_info = {"user_id": user_id, "phone": None, "address": None, "lat": None, "lng": None}
        if not user_id: return user_info

        try:
            # Check if user_id is a proper UUID
            is_uuid = bool(re.match(
                r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                user_id, re.IGNORECASE
            ))
            if is_uuid:
                conn = _get_conn()
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT user_id, phone, addresses FROM users WHERE user_id = %s", (user_id,))
                        row = cur.fetchone()
                        if row:
                            user_info["user_id"] = str(row[0])
                            user_info["phone"] = row[1]
                            addresses = row[2]
                            if addresses and isinstance(addresses, list) and len(addresses) > 0:
                                addr_obj = addresses[0]
                                if isinstance(addr_obj, dict):
                                    user_info["address"] = addr_obj.get("address") or addr_obj.get("full_address")
                                    if not user_info["address"]:
                                        components = [addr_obj.get('street'), addr_obj.get('area'), addr_obj.get('city'), addr_obj.get('province')]
                                        user_info["address"] = ", ".join([str(c) for c in components if c])
                                    
                                    user_info["lat"] = addr_obj.get("lat") or addr_obj.get("latitude")
                                    user_info["lng"] = addr_obj.get("lng") or addr_obj.get("longitude")
                                    
                                    # Coordinate fallback
                                    try:
                                        if not user_info["lat"] and addr_obj.get("street") and "." in str(addr_obj.get("street")):
                                            val_s = float(addr_obj.get("street"))
                                            val_c = float(addr_obj.get("city"))
                                            if 20 < val_s < 40 and 60 < val_c < 80:
                                                user_info["lat"] = val_s
                                                user_info["lng"] = val_c
                                    except: pass
                                else:
                                    user_info["address"] = str(addr_obj)
                            
                            if user_info["phone"] or user_info["address"]:
                                print(f"✅ [OrderHandler] Pre-loaded user info for {user_id} — phone={'YES' if user_info['phone'] else 'NO'}")
                conn.close()
            else:
                print(f"ℹ️ [OrderHandler] ID '{user_id[:15]}...' is not a UUID — skipping DB lookup")
        except Exception as e:
            print(f"⚠️ Error fetching user info for {user_id}: {e}")
        return user_info

    async def _lookup_user_id_by_phone(self, phone: str) -> Optional[str]:
        """Attempt to find a user_id by phone number."""
        if not phone: return None
        try:
            # Clean phone for lookup (remove spaces, dashes etc if needed, but here we assume exact match or + prefix)
            conn = _get_conn()
            with conn:
                with conn.cursor() as cur:
                    # Try exact match
                    cur.execute("SELECT user_id FROM users WHERE phone = %s", (phone,))
                    row = cur.fetchone()
                    if row:
                        return str(row[0])
                    
                    # Try partial match if phone doesn't have + prefix (common for local input)
                    if not phone.startswith('+'):
                        cur.execute("SELECT user_id FROM users WHERE phone LIKE %s", (f"%{phone}",))
                        row = cur.fetchone()
                        if row:
                            return str(row[0])
            conn.close()
        except Exception as e:
            print(f"⚠️ Error looking up user by phone: {e}")
        return None

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

    async def handle(self, query: str, history: list = None, summary: str = "", session_id: str = "default", user_id: str = None) -> Dict[str, Any]:
        # 0. Initialize or Update Context
        if session_id not in self.order_context:
            uid_to_lookup = user_id or session_id
            user_info = await self._fetch_user_info(uid_to_lookup)
            self.order_context[session_id] = {
                "items": [], "user_id": user_id or user_info.get("user_id"),
                "restaurant_id": None, "restaurant_name": "Assistant",
                "location_id": None, "phone": user_info.get("phone"),
                "address": user_info.get("address"), "lat": user_info.get("lat"), 
                "lng": user_info.get("lng"), "confirmed": False
            }
        else:
            # Update user_id if provided mid-session and re-fetch profile if unknown
            ctx = self.order_context[session_id]
            if user_id and ctx.get("user_id") != user_id:
                print(f"👤 [OrderHandler] Updating user_id for session {session_id}: {user_id}")
                ctx["user_id"] = user_id
                # Re-fetch profile info for the new user_id if phone/address are missing
                if not ctx.get("phone") or not ctx.get("address"):
                    user_info = await self._fetch_user_info(user_id)
                    if user_info.get("phone"): ctx["phone"] = user_info["phone"]
                    if user_info.get("address"): ctx["address"] = user_info["address"]
                    if user_info.get("lat"): ctx["lat"] = user_info["lat"]
                    if user_info.get("lng"): ctx["lng"] = user_info["lng"]
        
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
        
        # 1b. If restaurant_id is still missing, infer it from RAG results
        if not ctx["restaurant_id"] and rag_info.get("results"):
            # Pick the first restaurant that returned results
            for rid, rinfo in rag_info["results"].items():
                if rinfo.get("data", {}).get("chunks"):
                    ctx["restaurant_id"] = rid
                    ctx["restaurant_name"] = rinfo["name"]
                    print(f"🏠 [OrderHandler] Inferred restaurant: {ctx['restaurant_name']} ({rid})")
                    break

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
        
        EXISTING_USER_INFO:
        - Phone: {ctx.get('phone') or 'Not provided'}
        - Address: {ctx.get('address') or 'Not provided'}

        RECENT CONVERSATION HISTORY:
        {history_msgs}
        
        SUMMARY: {summary}
        USER QUERY: "{query}"
        
        JSON FORMAT: {{"intent": str, "items": list, "remove_items": list, "phone": str, "address": str, "suggestion": str, "error": str}}
        Intents: ["add_item", "remove_item", "update_item", "view_cart", "clear_cart", "confirm_order", "set_info", "question"]
        
        STRICT RULES:
        1. "add_item": ONLY extract items that appear in MENU CONTEXT above with a valid Item ID (UUID). Each item must have: name, quantity, price, item_id.
        2. "remove_item": Identify items in CURRENT CART that the user wants to remove. Put their exact names or IDs in "remove_items".
        3. "confirm_order": User wants to finalize/confirm. If phone/address are already in EXISTING_USER_INFO, DO NOT ask for them again.
        4. If phone or address are provided in NEW QUERY, extract them to update the info.
        5. HISTORY RESOLUTION & PERSISTENCE: 
           - If an item was just removed in recent history (user said "remove", "nikal do"), DO NOT add it back in "items" unless the user explicitly said to re-add it.
           - ONLY include items in the "items" list if they are being NEWLY ADDED or their QUANTITY is being explicitly changed. 
           - DO NOT just list everything currently in the cart in the "items" output; that's what CURRENT CART is for.
        6. If user says "yes", "han", "kar do" following a suggestion, add that suggested item.
        """
        
        messages = [
            {"role": "system", "content": "You are a specialized order extractor."},
            {"role": "user", "content": extraction_prompt}
        ]
        
        extraction_raw = await self.llm_service._call_openai_async(messages, response_format={"type": "json_object"})
        extraction = json.loads(extraction_raw) if extraction_raw else {}
        intent = extraction.get("intent", "question")
        
        if extraction.get("phone"): 
            ctx["phone"] = extraction["phone"]
            if not ctx.get("user_id"):
                ctx["user_id"] = await self._lookup_user_id_by_phone(ctx["phone"])
                if ctx["user_id"]:
                    print(f"👤 [OrderHandler] Linked session to user_id: {ctx['user_id']} via phone")

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
                res_en = f"I have your order ready for {self._cart_to_string(ctx['items'])}. However, I still need your {(not ctx['phone']) * 'phone number'} {(not ctx['phone'] and not ctx['address']) * 'and'} {(not ctx['address']) * 'delivery address'} to proceed."
            else:
                # We have both phone and address, now we confirm them
                # Check if the user's latest query is a generic "yes" or "ok" vs a confirmation request
                is_explicit_confirm = any(word in query_lower for word in ["yes", "han", "ji", "ok", "confirm", "order kar do", "kar do", "place", "ہاں", "جی", "کر دو", "کنفرم", "بالکل", "bilkul", "han ji", "okay", "done", "येस", "कंफर्म", "bilkul bilkul", "sahi hai"])
                
                if (is_explicit_confirm and ctx.get("confirmation_details_shown")) or \
                   (any(p in query_lower for p in ["confirm my order", "order confirm", "place my order", "order placement", "order kar do", "finalise", "آرڈر کنفرم", "آرڈر کر دو", "confirm kar do", "order confirm kar do"]) and ctx.get("phone") and ctx.get("address")):
                     # Actual placement
                    avail = await self._check_restaurant_availability(ctx["restaurant_id"], ctx["lat"], ctx["lng"])
                    if not avail["available"]:
                        res_en = f"I'm sorry, {ctx['restaurant_name']} is too far for delivery. Please try another restaurant."
                        res_type = "error"
                    else:
                        ctx["location_id"] = avail["location_id"]
                        # Ensure we have the latest user_id
                        if user_id: ctx["user_id"] = user_id
                        
                        if await self._save_order_to_db(ctx, session_id):
                            res_en = f"Success! Your order from {ctx['restaurant_name']} has been placed. It will be delivered to {ctx['address']}."
                            print(f"📦 [OrderHandler] Order SUCCESS for {ctx.get('user_id')}")
                            # Clear cart but KEEP user info for next time
                            self.order_context[session_id].update({
                                "items": [], 
                                "confirmed": True, 
                                "restaurant_id": None, 
                                "confirmation_details_shown": False
                            })
                        else:
                            res_en = "Database error while placing your order. Please try again."
                else:
                    # Just asking for confirmation with existing details
                    res_en = f"I've added {self._cart_to_string(ctx['items'])} from {ctx['restaurant_name']} to your cart. I'll be delivering it to {ctx['address']} and contacting you at {ctx['phone']}. Should I place the order now, or would you like to change anything?"
                    res_type = "confirmation_prompt"
                    ctx["confirmation_details_shown"] = True

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

    async def _save_order_to_db(self, ctx: dict, session_id: str, voice_transcript: str = "") -> bool:
        try:
            conn = _get_conn()
            with conn:
                with conn.cursor() as cur:
                    # Prioritize user_id from context, then fallback to session_id if it's a UUID, then lookup by phone
                    user_id = ctx.get("user_id")
                    if not user_id:
                        is_uuid = bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', session_id, re.IGNORECASE))
                        if is_uuid:
                            user_id = session_id
                        elif ctx.get("phone"):
                            user_id = await self._lookup_user_id_by_phone(ctx["phone"])
                    
                    print(f"📝 [OrderHandler] Saving order to DB. UserID={user_id}, RestaurantID={ctx.get('restaurant_id')}, Items={len(ctx.get('items', []))}")
                    subtotal = sum(float(i.get('price', 0)) * int(i.get('quantity', 1)) for i in ctx["items"])
                    tax_amount = round(subtotal * 0.15, 2)
                    delivery_fee = 100.0
                    total_amount = round(subtotal + tax_amount + delivery_fee, 2)
                    order_id = str(uuid.uuid4())

                    # Find best location_id
                    loc_id = ctx.get("location_id")
                    if not loc_id:
                        cur.execute(
                            "SELECT location_id FROM restaurant_locations WHERE restaurant_id = %s AND status = 'open' LIMIT 1",
                            (ctx["restaurant_id"],)
                        )
                        row = cur.fetchone()
                        if not row:
                            # Try without status filter (maybe status column differs)
                            cur.execute(
                                "SELECT location_id FROM restaurant_locations WHERE restaurant_id = %s LIMIT 1",
                                (ctx["restaurant_id"],)
                            )
                            row = cur.fetchone()
                        loc_id = row[0] if row else None
                    if not loc_id:
                        print(f"❌ No location found for restaurant {ctx['restaurant_id']}")
                        return False

                    # Build items JSON for the orders.items column
                    items_json = json.dumps([{
                        "item_id": i.get("item_id"),
                        "name": i["name"],
                        "quantity": i["quantity"],
                        "unit_price": i.get("price", 0),
                        "subtotal": float(i.get("price", 0)) * int(i.get("quantity", 1))
                    } for i in ctx["items"]])

                    cur.execute("""
                        INSERT INTO orders (
                            order_id, user_id, restaurant_id, location_id,
                            order_type, order_status, items,
                            subtotal, tax_amount, delivery_fee, discount_amount,
                            total_amount, currency,
                            delivery_address, phone,
                            special_instructions, voice_transcript,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s,
                            'voice', 'pending', %s,
                            %s, %s, %s, 0,
                            %s, 'PKR',
                            %s, %s,
                            NULL, %s,
                            NOW(), NOW()
                        )
                    """, (
                        order_id, user_id, ctx["restaurant_id"], loc_id,
                        items_json,
                        subtotal, tax_amount, delivery_fee,
                        total_amount,
                        ctx.get("address"), ctx.get("phone"),
                        voice_transcript or ""
                    ))

                    # Insert individual order_items rows
                    for item in ctx["items"]:
                        item_id = item.get("item_id")
                        if item_id and len(item_id) >= 32:
                            order_item_id = str(uuid.uuid4())
                            unit_price = float(item.get("price", 0))
                            qty = int(item.get("quantity", 1))
                            cur.execute("""
                                INSERT INTO order_items (
                                    order_item_id, order_id, menu_item_id,
                                    quantity, unit_price, subtotal,
                                    variants_selected, special_instructions,
                                    created_at, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, '{}', NULL, NOW(), NOW())
                            """, (order_item_id, order_id, item_id, qty, unit_price, unit_price * qty))

                    print(f"✅ Order {order_id} saved — user={user_id} restaurant={ctx['restaurant_name']} total=PKR{total_amount}")
                    ctx["last_order_id"] = order_id
                    return True
        except Exception as e:
            print(f"❌ DB Error saving order: {e}")
            import traceback; traceback.print_exc()
            return False

    def _cart_to_string(self, items: List[dict]) -> str:
        if not items: return "nothing"
        return ", ".join([f"{i['quantity']}x {i['name']}" for i in items])

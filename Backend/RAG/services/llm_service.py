import os
import json
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import re

load_dotenv()

class GroqLLMService:
    def __init__(self):
        self.api_key = os.getenv('GROQ_API_KEY')
        self.base_url = os.getenv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
        # Groq models (OpenAI-compatible). Prefer current supported defaults
        configured_model = os.getenv('LLM_MODEL', 'llama-3.3-70b-versatile')
        # Migrate deprecated names to supported ones
        deprecated_map = {
            'llama-3.1-70b-versatile': 'llama-3.3-70b-versatile',
            'llama-3.1-70b': 'llama-3.3-70b-versatile',
        }
        self.model = deprecated_map.get(configured_model, configured_model)
        self.temperature = float(os.getenv('TEMPERATURE', '0.8'))  # Slightly higher for more natural conversation
        self.max_tokens = int(os.getenv('MAX_TOKENS', '150'))  # Brief but allows complete answers

        # Check if API key is properly configured
        if not self.api_key or self.api_key.strip() in ['your_groq_api_key_here', '']:
            print("⚠️  Groq API key not configured. Using fallback responses.")
            self.api_configured = False
        else:
            self.api_configured = True
            print(f"✅ Using Groq model: {self.model}")
        print(f"ℹ️  Groq base_url: {self.base_url}")
    
    def generate_response(self, user_message: str, context: str = "", conversation_history: list = None) -> str:
        """Generate a response using OpenRouter API with RAG context"""
        
        # If API is not configured, use fallback
        if not self.api_configured:
            return self._get_fallback_response(user_message, context)
        
        # Create the system prompt for voice-like conversation
        system_prompt = self._create_system_prompt()
        
        # Build user message with context if provided
        if context:
            # Check if user is asking about prices
            user_lower = user_message.lower()
            asking_about_prices = any(kw in user_lower for kw in ['price', 'prices', 'cost', 'how much', 'deal'])
            
            if asking_about_prices:
                user_prompt = f"""Customer asked: "{user_message}"

Here is the menu information from our database:
{context}

IMPORTANT: The customer is asking about prices/deals. 
- Look for prices in the menu information (they might be formatted as "Rs. 1,249", "Rs. 1249", or "Rs. , 249" - extract the numbers)
- You MUST include the actual prices from the menu information
- Present the deals and prices naturally in a conversational way (no markdown formatting, no **bold**, just natural speech)
- Example: "We have the Family Feast for Rs. 1,499 and the Student Deal for Rs. 399" instead of using bullet points or bold text"""
            else:
                user_prompt = f"""Customer asked: "{user_message}"

Here is the menu information from our database:
{context}

Please answer their question using this information. Extract the relevant details and give a natural, conversational response."""
        else:
            user_prompt = user_message
        
        # Models exposed by Groq support system messages via OpenAI-compatible API
        if True:
            # Use system message format for compatible models
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if provided
            if conversation_history:
                for msg in conversation_history[-6:]:  # Keep last 6 messages for context
                    messages.append(msg)
            
            # Add current user message
            messages.append({"role": "user", "content": user_prompt})
        
        try:
            if not self.api_configured:
                print("ℹ️  generate_response: API not configured → returning fallback response")
                return self._get_fallback_response(user_message, context)

            def call_model(model_name: str):
                actual_max_tokens = self.max_tokens
                print(f"➡️  Calling Groq /chat/completions | model={model_name} temp={self.temperature} max_tokens={actual_max_tokens}")
                resp = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "messages": messages,
                        "temperature": self.temperature,
                        "max_tokens": actual_max_tokens,
                        "stream": False
                    },
                    timeout=30
                )
                print(f"⬅️  Groq response status: {resp.status_code}")
                return resp

            # Try primary model, then fallbacks if decommissioned or 404/400
            candidate_models = [self.model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
            last_error_text = None
            for model_name in candidate_models:
                response = call_model(model_name)
                if response.status_code == 200:
                    result = response.json()
                    if 'choices' not in result or not result['choices']:
                        print(f"❌ Unexpected API response structure: {result}")
                        last_error_text = str(result)
                        continue
                    choice = result['choices'][0]
                    raw_response = (
                        choice.get('message', {}).get('content')
                        or choice.get('delta', {}).get('content')
                        or ''
                    ).strip()
                    print(f"🧠 Groq text length: {len(raw_response)}")
                    cleaned_response = self._clean_response(raw_response)
                    # Update to working model for subsequent calls
                    self.model = model_name
                    return cleaned_response
                else:
                    try:
                        err = response.json()
                    except Exception:
                        err = {"error": {"message": response.text}}
                    msg = err.get('error', {}).get('message', response.text)
                    print(f"❌ Groq API error {response.status_code} on {model_name}: {msg}")
                    last_error_text = msg
                    # If decommissioned or not found, try next
                    if response.status_code in (400, 404):
                        continue
                    # Other errors (401/402) should break
                    if response.status_code in (401, 402):
                        break

            # If we reach here, all candidates failed
            print(f"💤 Falling back after Groq failures: {last_error_text}")
            return self._get_fallback_response(user_message, context)
                
        except Exception as e:
            print(f"❌ Error calling Groq API: {e}")
            return self._get_fallback_response(user_message, context)

    def is_configured(self) -> bool:
        return self.api_configured
    
    def _create_system_prompt(self) -> str:
        """Create a natural, conversational system prompt for phone-call responses"""
        
        base_prompt = """You are a friendly restaurant assistant helping customers over the phone. 

Your job:
- Answer questions naturally and conversationally, like you're talking to a friend
- Use the menu information provided to answer questions
- ALWAYS include prices when available - if prices are shown in the menu (even if formatted as "Rs. 1,249" or "Rs. 1249"), extract and include them
- Present information naturally without markdown formatting (no **bold**, no bullet points with dashes)
- Keep answers brief and conversational (1-2 sentences usually)
- Don't include page numbers, "Page 2:", or raw formatting

IMPORTANT: 
- If the customer asks about prices or deals, you MUST include the actual prices from the menu information
- Prices might be formatted as "Rs. 1,249" or "Rs. 1249" - extract the numbers and present them naturally
- Do not use markdown formatting like **bold** or bullet points - just write naturally like you're speaking"""

        return base_prompt
    
    def _clean_response(self, response: str) -> str:
        """Clean LLM response to remove formatting artifacts and garbage text"""
        if not response:
            return response
        
        # FIRST: Extract the actual answer if LLM included raw data
        # Pattern: raw data + "user query" → "answer"
        # We want only the answer part (after the arrow)
        cleaned = response
        arrow_chars = ['→', '->', '- >']
        answer_extracted = False
        
        for arrow_char in arrow_chars:
            if arrow_char in cleaned:
                arrow_index = cleaned.find(arrow_char)
                if arrow_index != -1:
                    # Get text after arrow
                    after_arrow = cleaned[arrow_index + len(arrow_char):].strip()
                    # Extract quoted answer if present
                    quoted_match = re.search(r'"([^"]+)"', after_arrow)
                    if quoted_match:
                        cleaned = quoted_match.group(1)
                        answer_extracted = True
                        break
                    else:
                        # No quotes, just take what's after arrow (first 200 chars max)
                        cleaned = after_arrow[:200].strip()
                        answer_extracted = True
                        break
        
        # If no arrow found, try to find the last quoted string (likely the answer)
        if not answer_extracted:
            quoted_answer = re.search(r'"([^"]+)"\s*$', cleaned)
            if quoted_answer:
                cleaned = quoted_answer.group(1)
                answer_extracted = True
        
        # If we extracted an answer, skip all the raw data cleaning
        if answer_extracted:
            # Just do basic cleanup
            cleaned = cleaned.strip()
            # Remove extra whitespace
            cleaned = re.sub(r'\s+', ' ', cleaned)
            return cleaned.strip()
        
        # Otherwise, continue with normal cleaning
        
        # Remove special tokens and formatting
        patterns_to_remove = [
            r'<start>.*?<\|message\|>',
            r'<\|.*?\|>',
            r'<start>.*?<\|channel\|>.*?<\|message\|>',
            r'<\|channel\|>',
            r'<\|final\|>',
            r'<\|assistant\|>',
            r'<\|user\|>',
            r'<\|system\|>',
            r'<start>',
            r'<end>',
            r'<\|endoftext\|>',
            r'<\|im_start\|>',
            r'<\|im_end\|>',
            r'Assistant:',
            r'User:',
            r'System:',
            r'Human:',
            r'AI:',
            r'Bot:',
            r'ChatGPT:',
            r'Claude:',
            r'Gemini:'
        ]
        
        for pattern in patterns_to_remove:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove instruction repetitions (common LLM hallucination)
        instruction_patterns = [
            r'\(Remember to be brief\)',
            r'\(Remember to be direct\)',
            r'\(Remember to be brief and direct\)',
            r'\(Remember you are a restaurant assistant\)',
            r'\(Remember to answer\)',
            r'\(Remember to be helpful\)',
            r'You can answer now:?',
            r'You can respond now:?',
            r'You can answer:?',
            r'You can respond:?',
            r'Answer:',
            r'Response:',
            r'\(Remember.*?\)',
        ]
        
        for pattern in instruction_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        # Remove user's query if it appears in the response (common LLM mistake)
        # Extract potential user query patterns
        user_query_patterns = [
            r'Customer asked:.*?',
            r'Customer:.*?',
            r'what you know what like',
            r'what.*?do you offer',
            r'"hi how are you.*?"',  # Remove quoted user queries
            r'"can you let me know.*?"',
            r'→.*?$',  # Remove everything after arrow (including user query)
        ]
        
        for pattern in user_query_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove common verbose phrases
        verbose_phrases = [
            r"I'm doing great,? thanks for asking,?",
            r"I'm \d+ years old,?",
            r"what you know what",
            r"so can you let me know",
        ]
        
        for phrase in verbose_phrases:
            cleaned = re.sub(phrase, '', cleaned, flags=re.IGNORECASE)
        
        # Remove page numbers and raw context data that LLM might include
        raw_data_patterns = [
            r'Page \d+:.*?(?=\n|Page \d+:|$)',
            r'Page \d+:',
            r'^\d+\.\s+',  # Remove numbered lists at start
        ]
        
        for pattern in raw_data_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.MULTILINE)
        
        # The LLM sometimes outputs: raw data + "user query" → "answer"
        # We want only the answer part (after the arrow)
        # Check for arrow (→) or regular arrow (- >)
        arrow_chars = ['→', '->', '- >']
        arrow_found = False
        
        for arrow_char in arrow_chars:
            if arrow_char in cleaned:
                arrow_index = cleaned.find(arrow_char)
                if arrow_index != -1:
                    # Get text after arrow
                    after_arrow = cleaned[arrow_index + len(arrow_char):].strip()
                    # Extract quoted answer if present
                    quoted_match = re.search(r'"([^"]+)"', after_arrow)
                    if quoted_match:
                        cleaned = quoted_match.group(1)
                        arrow_found = True
                        break
                    else:
                        # No quotes, just take what's after arrow
                        cleaned = after_arrow.strip()
                        arrow_found = True
                        break
        
        # If no arrow found, try to find the last quoted string (likely the answer)
        if not arrow_found:
            quoted_answer = re.search(r'"([^"]+)"\s*$', cleaned)
            if quoted_answer:
                cleaned = quoted_answer.group(1)
        
        # Remove markdown formatting (**bold**, *italic*, etc.)
        cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)  # Remove **bold**
        cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)  # Remove *italic*
        cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)  # Remove `code`
        cleaned = re.sub(r'#+\s*', '', cleaned)  # Remove markdown headers
        cleaned = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', cleaned)  # Remove links
        
        # Remove all raw data patterns that might still be present
        # Remove everything that looks like "Page X:", numbered lists, etc.
        lines = cleaned.split('\n')
        final_lines = []
        for line in lines:
            line_stripped = line.strip()
            # Skip lines with page numbers, attributes, etc.
            if any(skip in line_stripped for skip in ['Page ', 'Attribute', 'Value', 'Restaurant ID']):
                continue
            # Skip empty lines
            if not line_stripped:
                continue
            # Skip lines that are just numbers or list items
            if re.match(r'^\d+\.?\s*$', line_stripped):
                continue
            final_lines.append(line_stripped)
        
        cleaned = ' '.join(final_lines).strip()
        
        # Remove lines that look like raw data (containing "Page", "Attribute", etc.)
        lines = cleaned.split('\n')
        cleaned_lines = []
        for line in lines:
            line_stripped = line.strip()
            # Skip lines that look like raw context data
            if any(skip_word in line_stripped for skip_word in ['Page ', 'Attribute', 'Value', 'Restaurant ID', 'Description:', 'Founded:']):
                continue
            # Skip empty lines
            if not line_stripped:
                continue
            cleaned_lines.append(line)
        
        cleaned = '\n'.join(cleaned_lines)
        
        # Remove extra whitespace and normalize
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip()
        
        # Remove leading/trailing punctuation that might be left over
        cleaned = re.sub(r'^[.,!?;:]+', '', cleaned)
        cleaned = re.sub(r'[.,!?;:]+$', '', cleaned)
        
        # If the response is empty after cleaning, return a fallback
        if not cleaned or len(cleaned.strip()) < 5:
            return "I understand your request. How can I help you with our menu today?"
        
        return cleaned
    
    def _get_fallback_response(self, user_message: str, context: str = "") -> str:
        """Provide intelligent fallback responses when API is unavailable"""
        user_lower = user_message.lower()
        
        # Try to detect which restaurants the user is asking about
        mentioned_restaurants = []
        if "pizza hut" in user_lower or "hut" in user_lower:
            mentioned_restaurants.append("Pizza Hut")
        if "kfc" in user_lower or "kentucky" in user_lower:
            mentioned_restaurants.append("KFC")
        if "cheezious" in user_lower or "cheezy" in user_lower:
            mentioned_restaurants.append("Cheezious")
        
        # Determine if this is a multi-restaurant query
        if len(mentioned_restaurants) > 1:
            restaurant_names = " and ".join(mentioned_restaurants)
            return self._get_multi_restaurant_fallback(user_message, restaurant_names, context)
        elif len(mentioned_restaurants) == 1:
            restaurant_name = mentioned_restaurants[0]
        else:
            restaurant_name = "our restaurants"
        
        # Greeting responses
        if any(word in user_lower for word in ['hello', 'hi', 'hey', 'how are you']):
            return f"Hello! I'm your {restaurant_name} voice assistant. I'm here to help you with our delicious menu and ordering options. What would you like to know?"
        
        # Menu inquiries
        if any(word in user_lower for word in ['menu', 'what do you have', 'options', 'food']):
            return f"We have a fantastic menu at {restaurant_name}! What type of food are you in the mood for?"
        
        # Pizza inquiries
        if any(word in user_lower for word in ['pizza', 'pizzas']):
            if restaurant_name == "Pizza Hut":
                return f"Great choice! At Pizza Hut we have amazing pan pizzas, stuffed crust options, and classic favorites. Our Supreme pizza is very popular. Would you like to hear more about our pizza options?"
            elif restaurant_name == "Cheezious":
                return f"Great choice! At Cheezious we have amazing pizzas including Local Love, Sooper, and Special varieties. Our Chicken Supreme is very popular at Rs. 690. Would you like to hear more about our pizza options?"
            else:
                return f"Great choice! We have amazing pizzas at {restaurant_name}. Would you like to hear more about our pizza options?"
        
        # Chicken inquiries
        if any(word in user_lower for word in ['chicken', 'fried chicken']):
            if restaurant_name == "KFC":
                return f"Perfect! At KFC we have the original fried chicken recipe with our secret blend of 11 herbs and spices. We offer pieces, strips, wings, and family buckets. What would you like to try?"
            else:
                return f"We have delicious chicken options at {restaurant_name}. What would you like to know about our chicken dishes?"
        
        # Price inquiries
        if any(word in user_lower for word in ['price', 'cost', 'how much', 'expensive']):
            return f"Our prices at {restaurant_name} are very reasonable! What specific item are you interested in?"
        
        # Location inquiries
        if any(word in user_lower for word in ['location', 'where', 'branch', 'delivery']):
            return f"We have multiple branches of {restaurant_name} across Pakistan! We offer delivery through our app, website, and delivery partners. What city are you in?"
        
        # Order inquiries
        if any(word in user_lower for word in ['order', 'buy', 'get', 'want', 'like']):
            return f"Perfect! I'd be happy to help you place an order at {restaurant_name}. What would you like to order? I can help you with our menu items and prices."
        
        # Sad/emotional responses
        if any(word in user_lower for word in ['sad', 'depressed', 'unhappy', 'bad day']):
            return f"I'm sorry to hear you're feeling down! A delicious meal from {restaurant_name} might help cheer you up. We have comfort food that's sure to make you feel better. What sounds good to you?"
        
        # General fallback
        return f"Thanks for your message! I'm here to help you with our {restaurant_name} menu, prices, locations, and ordering. What would you like to know about?"
    
    def _get_multi_restaurant_fallback(self, user_message: str, restaurant_names: str, context: str = "") -> str:
        """Provide fallback responses for multi-restaurant queries"""
        user_lower = user_message.lower()
        
        # Deals inquiries
        if any(word in user_lower for word in ['deal', 'offer', 'combo', 'special']):
            return f"Great question! Both {restaurant_names} have excellent deals. {restaurant_names} offer various combo meals and special promotions. Would you like me to tell you about specific deals from each restaurant?"
        
        # Price inquiries
        if any(word in user_lower for word in ['price', 'cost', 'how much', 'expensive']):
            return f"Both {restaurant_names} have competitive pricing! {restaurant_names} offer great value for money with different price ranges. Would you like to compare specific items or see the most affordable options?"
        
        # Location inquiries
        if any(word in user_lower for word in ['location', 'where', 'branch', 'delivery']):
            return f"Both {restaurant_names} have multiple locations across Pakistan! They offer delivery through their apps, websites, and delivery partners. Would you like to know about specific cities or delivery options?"
        
        # Menu inquiries
        if any(word in user_lower for word in ['menu', 'what do you have', 'options', 'food']):
            return f"Both {restaurant_names} have fantastic menus! They offer different specialties - would you like to know about specific items from each restaurant?"
        
        # General fallback
        return f"Thanks for your message! I can help you with information about {restaurant_names}. What specific information would you like to know about these restaurants?"
    
    def generate_voice_response(self, user_message: str, context: str = "") -> Dict[str, Any]:
        """Generate a response optimized for voice interaction"""
        
        # Get the text response
        text_response = self.generate_response(user_message, context)
        
        # Determine response type and additional info
        response_info = {
            "text": text_response,
            "type": "conversation",
            "suggestions": [],
            "requires_followup": False
        }
        
        # Analyze response for follow-up needs
        user_lower = user_message.lower()
        response_lower = text_response.lower()
        
        # Check if this is an order-related conversation
        if any(word in user_lower for word in ['order', 'want', 'like', 'get', 'buy']):
            response_info["type"] = "order_intent"
            response_info["suggestions"] = [
                "Would you like me to help you place that order?",
                "Should I add that to your cart?",
                "Great choice! Any sides or drinks with that?"
            ]
            response_info["requires_followup"] = True
        
        # Check if this is a menu question
        elif any(word in user_lower for word in ['what', 'menu', 'have', 'available', 'price']):
            response_info["type"] = "menu_inquiry"
            response_info["suggestions"] = [
                "Would you like to know more about that item?",
                "Should I tell you about similar options?",
                "Would you like to order that?"
            ]
        
        return response_info
    
    def generate_order_summary(self, order_items: list) -> str:
        """Generate a summary of the order for confirmation"""
        
        if not order_items:
            return "I don't see any items in your order yet. What would you like to order?"
        
        order_text = "Here's your order:\n"
        total_estimate = 0
        
        for item in order_items:
            order_text += f"• {item['name']} - {item.get('price', 'Price TBD')}\n"
            # Extract price for total calculation
            price_str = item.get('price', '0')
            try:
                price = int(''.join(filter(str.isdigit, price_str)))
                total_estimate += price
            except:
                pass
        
        order_text += f"\nEstimated total: Rs. {total_estimate}"
        order_text += "\n\nWould you like to confirm this order?"
        
        return order_text

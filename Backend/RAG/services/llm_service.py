import os
import json
import requests
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import re

load_dotenv()

class OpenAILLMService:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        # gpt-4o-mini is much smarter than Groq models
        self.model = os.getenv('LLM_MODEL', 'gpt-4o-mini')
        self.temperature = float(os.getenv('TEMPERATURE', '0.7'))
        self.max_tokens = int(os.getenv('MAX_TOKENS', '500'))

        # Check if API key is properly configured
        if not self.api_key or self.api_key.strip() in ['your_openai_api_key_here', '']:
            print("⚠️  OpenAI API key not configured. Using fallback responses.")
            self.api_configured = False
        else:
            self.api_configured = True
            print(f"✅ Using OpenAI model: {self.model}")
        print(f"ℹ️  OpenAI base_url: {self.base_url}")

    def _call_openai(self, messages: List[Dict], max_tokens: Optional[int] = None) -> str:
        """Low-level call to OpenAI API"""
        if not self.api_configured:
            return ""

        tokens = max_tokens or self.max_tokens
        print(f"➡️  Calling OpenAI /chat/completions | model={self.model} temp={self.temperature} max_tokens={tokens}")
        try:
            resp = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": self.temperature,
                    "max_tokens": tokens,
                    "stream": False
                },
                timeout=30
            )
            
            if resp.status_code == 200:
                result = resp.json()
                if 'choices' in result and result['choices']:
                    return result['choices'][0]['message']['content'].strip()
            else:
                print(f"❌ OpenAI API error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"❌ Network error calling OpenAI: {e}")
            
        return ""
    
    def generate_response(self, user_message: str, context: str = "", conversation_history: list = None) -> str:
        """Generate a response using OpenAI API with RAG context"""
        
        # If API is not configured, use fallback
        if not self.api_configured:
            return self._get_fallback_response(user_message, context)
        
        # Create the system prompt for voice-like conversation
        system_prompt = self._create_system_prompt()
        
        # Build user message with context
        if context:
            user_lower = user_message.lower()
            asking_about_prices = any(kw in user_lower for kw in ['price', 'prices', 'cost', 'how much', 'deal'])
            
            if asking_about_prices:
                user_prompt = f"""Customer asked: "{user_message}"\n\nMenu information:\n{context}\n\nIMPORTANT: Customer is asking about prices. Include actual prices naturally. No markdown."""
            else:
                user_prompt = f"""Customer asked: "{user_message}"\n\nMenu information:\n{context}\n\nPlease answer naturally using this information."""
        else:
            user_prompt = user_message
        
        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append(msg)
        messages.append({"role": "user", "content": user_prompt})

        try:
            raw_response = self._call_openai(messages)
            if not raw_response:
                return self._get_fallback_response(user_message, context)
            
            return self._clean_response(raw_response)
        except Exception as e:
            print(f"❌ Error in generate_response: {e}")
            return self._get_fallback_response(user_message, context)

    def is_configured(self) -> bool:
        return self.api_configured
    
    def _create_system_prompt(self) -> str:
        """Create a natural, conversational system prompt for phone-call responses"""
        
        base_prompt = """You are a professional restaurant voice assistant. 

Your goals:
- Answer customer questions naturally and concisely (1-2 sentences).
- Use the provided menu information to answer accurately.
- ALWAYS include prices from the menu naturally.
- NO markdown formatting (no **bold**, no bullet points with - or *).
- If the user uses Roman Urdu, respond in Roman Urdu.
- If the user uses English, respond in English.
- Use only the English alphabet for all responses.

CRITICAL: 
- Provide high-quality, professional, and helpful responses.
- Be extremely polite and efficient."""

        return base_prompt
    
    def generate_summary(self, existing_summary: str, new_messages: List[Dict]) -> str:
        """Generate a concise, factual summary of the conversation so far"""
        if not self.api_configured:
            return existing_summary

        messages_text = "\n".join([f"{m['role']}: {m['content']}" for m in new_messages])
        
        prompt = f"""Existing Summary: "{existing_summary}"\n\nNew messages:\n{messages_text}\n\nUpdate the summary briefly (1-2 sentences). Return ONLY the new summary."""

        messages = [
            {"role": "system", "content": "You are a factual summarization assistant."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = self._call_openai(messages, max_tokens=150)
            return response.strip()
        except Exception as e:
            print(f"⚠️ Summary failed: {e}")
            return existing_summary

    def translate_to_urdu(self, text: str) -> str:
        """Translate text to Urdu script (Arabic characters)"""
        if not self.api_configured:
            return text

        messages = [
            {"role": "system", "content": "Translate the text into natural Urdu script (Arabic characters). No English alphabet."},
            {"role": "user", "content": f"Translate this to Urdu script: {text}"}
        ]
        
        try:
            response = self._call_openai(messages, max_tokens=300)
            return response.strip()
        except Exception as e:
            print(f"⚠️ Translation failed: {e}")
            return text

    def _clean_response(self, response: str) -> str:
        """Clean LLM response to remove formatting artifacts"""
        if not response:
            return response
        
        # Simple cleanup as GPT-4o-mini is usually very good at following instructions
        cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', response)
        cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)
        cleaned = re.sub(r'#+\s*', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()
    
    def _get_fallback_response(self, user_message: str, context: str = "") -> str:
        return "I'm sorry, I'm having trouble connecting to my brain right now. Can you please try again in a moment?"

    def generate_voice_response(self, user_message: str, context: str = "") -> Dict[str, Any]:
        text_response = self.generate_response(user_message, context)
        return {"text": text_response, "type": "chat"}

    def generate_order_summary(self, order_items: list) -> str:
        if not order_items:
            return "Your cart is empty."
        
        summary = "Here is your order summary:\n"
        total = 0
        for item in order_items:
            price = item.get('price', '0')
            try:
                numeric_price = int(re.sub(r'\D', '', price)) if price else 0
                total += numeric_price
            except: pass
            summary += f"- {item['name']}: {price}\n"
        
        summary += f"\nTotal: Rs. {total}. Would you like to confirm?"
        return summary


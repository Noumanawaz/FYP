from typing import Dict, Any

class BasicHandler:
    def handle(self, query: str) -> Dict[str, Any]:
        """Handle basic greetings and simple interactions"""
        query_lower = query.lower()
        
        # Responses for various basic interactions
        if any(word in query_lower for word in ['hello', 'hi', 'hey', 'greetings', 'salam']):
            return {
                "response": "Hello! Welcome to our restaurant voice assistant. How can I help you today?",
                "response_en": "Hello! Welcome to our restaurant voice assistant. How can I help you today?",
                "response_ur": "Assalam-o-Alaikum! Restaurant voice assistant mein khush amdeed. Main aaj aap ki kaise madad kar sakta hoon?",
                "response_type": "greeting",
                "confidence": 1.0
            }
            
        if any(word in query_lower for word in ['bye', 'goodbye', 'see you']):
            return {
                "response": "Goodbye! Have a great day!",
                "response_en": "Goodbye! Have a great day!",
                "response_ur": "Khuda hafiz! Aap ka din accha guzray!",
                "response_type": "greeting",
                "confidence": 1.0
            }
            
        if any(word in query_lower for word in ['thanks', 'thank you']):
            return {
                "response": "You're welcome! Let me know if you need anything else.",
                "response_en": "You're welcome! Let me know if you need anything else.",
                "response_ur": "Koi baat nahi! Agar aap ko kisi aur cheez ki zaroorat ho to batayen.",
                "response_type": "greeting",
                "confidence": 1.0
            }
            
        # Default fallback for basic handler
        return {
            "response": "Hello! I'm here to help you order food or answer questions about our menu.",
            "response_en": "Hello! I'm here to help you order food or answer questions about our menu.",
            "response_ur": "Salam! Main yahan hoon taake aap khana order kar saken ya hamaray menu ke baray mein sawalat puch saken.",
            "response_type": "greeting",
            "confidence": 1.0
        }

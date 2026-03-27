from typing import Dict, Any

class BasicHandler:
    def __init__(self, llm_service):
        self.llm_service = llm_service

    async def handle(self, query: str, history: list = None, summary: str = "") -> Dict[str, Any]:
        """Handle basic greetings and simple interactions using LLM with context"""
        # Specific prompt for basic/general interactions
        history_context = f"\nPAST CONVERSATION SUMMARY: {summary}\n" if summary else ""
        
        basic_prompt_suffix = f"""
        {history_context}
        You are handling a GENERAL interaction. 
        - If they mention their name (like "Shahad"), REMEMBER IT and use it in your response.
        - Check the PAST CONVERSATION SUMMARY for details you should know.
        - PHONETIC PROTECTION: Users often say "serious" or "jesus" when they mean the restaurant "Cheezious". If they say "I like serious" or "serious options", THEY ARE TALKING ABOUT THE RESTAURANT CHEEZIOUS. Do not talk about music or literal seriousness.
        - If it's a greeting, respond warmly.
        - If it's a general question about food/restaurants, answer concisely.
        - Remember: Be concise (1-2 sentences).
        """
        
        # Use dual response to get both languages at once
        responses = await self.llm_service.generate_dual_response(
            user_message=query,
            context=basic_prompt_suffix,
            conversation_history=history
        )
        
        return {
            "response": responses['en'],
            "response_en": responses['en'],
            "response_ur": responses['ur'],
            "response_type": "greeting",
            "confidence": 1.0,
            "restaurant_name": "Assistant"
        }

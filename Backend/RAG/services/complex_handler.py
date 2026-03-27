from typing import Dict, Any
import asyncio

class ComplexHandler:
    def __init__(self, llm_service, rag_system):
        self.llm_service = llm_service
        self.rag_system = rag_system

    async def handle(self, query: str, history: list = None, summary: str = "") -> Dict[str, Any]:
        """Handle complex menu/restaurant queries using RAG with history context"""
        
        # 1. RAG Context Retrieval
        rag_result = await asyncio.to_thread(self.rag_system.process_query, query, summary)
        raw_context = rag_result.get('context', '')
        
        # 2. Build combined context including history summary
        # This gives the LLM memory of what was discussed previously
        if not raw_context.strip() or len(raw_context) < 50:
            combined_context = f"CONVERSATION SUMMARY: {summary}\n\nRESTAURANT INFO: Menu details for this restaurant are currently unavailable in our database. Do NOT hallucinate menu items. Tell the user you don't have the specific menu yet."
        else:
            combined_context = f"CONVERSATION SUMMARY: {summary}\n\nRESTAURANT INFO:\n{raw_context}"
        
        # 3. Dual LLM Response with history
        responses = await self.llm_service.generate_dual_response(
            user_message=query, 
            context=combined_context,
            conversation_history=history
        )
        
        # Metadata extraction
        detected = rag_result.get('detected_restaurants', [])
        primary_restaurant = detected[0]['name'] if detected else "Assistant"
        confidence = detected[0]['confidence'] if detected else 1.0
        
        return {
            "response": responses['en'],
            "response_en": responses['en'],
            "response_ur": responses['ur'],
            "restaurant_name": primary_restaurant,
            "confidence": confidence,
            "suggestions": rag_result.get("suggestions", []),
            "response_type": "complex"
        }

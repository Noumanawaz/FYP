class OrchestratorService:
    def __init__(self, llm_service):
        self.llm_service = llm_service
        
    def classify_query(self, query: str) -> str:
        """
        Classifies the query into one of three categories using LLM:
        1. 'greeting' - Basic greetings and pleasantries
        2. 'order' - Explicit intent to order
        3. 'complex' - Questions needing RAG (default)
        """
        if not self.llm_service:
            # Fallback for when LLM service is not available
            return "complex"

        prompt = f"""You are a query classifier for a restaurant voice assistant.
Classify the following user query into exactly one of these three categories:
1. GREETING (for hello, hi, bye, thanks, simple pleasantries)
2. ORDER (for explicit intent to order food, e.g. "I want to order", "send me pizza")
3. COMPLEX (for questions about menu, prices, ingredients, recommendations, or anything else)

Query: "{query}"

Return ONLY the category name (GREETING, ORDER, or COMPLEX). Do not add any explanation."""

        try:
            # We use a lower temperature for classification consistency
            original_temp = self.llm_service.temperature
            self.llm_service.temperature = 0.1
            
            response = self.llm_service.generate_response(prompt).strip().upper()
            
            # Restore temperature
            self.llm_service.temperature = original_temp
            
            # Clean response just in case
            if "GREETING" in response:
                return "greeting"
            elif "ORDER" in response:
                return "order"
            else:
                return "complex"
                
        except Exception as e:
            print(f"⚠️ Orchestrator LLM error: {e}")
            return "complex"

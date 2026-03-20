class OrchestratorService:
    def __init__(self, llm_service, session_manager=None):
        self.llm_service = llm_service
        self.session_manager = session_manager
        
    def classify_query(self, query: str, session_id: str = None) -> str:
        """
        Classifies the query into one of three categories.
        Now supports session history for better classification context.
        """
        if not self.llm_service:
            return "complex"

        # If a session exists, we could theoretically include previous context 
        # to improve classification, but for now we keep classification focused on the current query.
        prompt = f"""You are a query classifier for a restaurant voice assistant.
Classify the following user query into exactly one of these three categories:
1. GREETING (for hello, hi, bye, thanks, simple pleasantries)
2. ORDER (for explicit intent to order food, e.g. "I want to order", "send me pizza")
3. COMPLEX (for questions about menu, prices, ingredients, recommendations, or anything else)

Query: "{query}"

Return ONLY the category name (GREETING, ORDER, or COMPLEX). Do not add any explanation."""

        try:
            original_temp = self.llm_service.temperature
            self.llm_service.temperature = 0.1
            
            response = self.llm_service.generate_response(prompt).strip().upper()
            self.llm_service.temperature = original_temp
            
            if "GREETING" in response:
                return "greeting"
            elif "ORDER" in response:
                return "order"
            else:
                return "complex"
                
        except Exception as e:
            print(f"⚠️ Orchestrator LLM error: {e}")
            return "complex"

    def get_agent_context(self, session_id: str) -> str:
        """
        Builds a comprehensive context string for the agent including:
        1. rolling summary
        2. last 5 messages
        """
        if not self.session_manager or not session_id:
            return ""

        context_data = self.session_manager.get_context_for_agent(session_id)
        summary = context_data.get("summary", "")
        history = context_data.get("history", [])

        history_text = "\n".join([f"{m['role']}: {m['content']}" for m in history])
        
        context_string = f"\nCONVERSATION CONTEXT:\n"
        if summary:
            context_string += f"Summary so far: {summary}\n"
        
        if history:
            context_string += f"Recent history:\n{history_text}\n"
            
        return context_string

    def update_session_summary(self, session_id: str):
        """Triggers a summary update if enough new messages are present"""
        if not self.session_manager or not self.llm_service or not session_id:
            return

        session = self.session_manager.get_session(session_id)
        messages = session.get("messages", [])
        
        # Summarize if we have at least 3 messages and no summary, or every 5 messages
        if len(messages) >= 3:
            new_summary = self.llm_service.generate_summary(session.get("summary", ""), messages[-5:])
            self.session_manager.update_summary(session_id, new_summary)
            print(f"✨ [Orchestrator] Updated summary for {session_id}: {new_summary}")

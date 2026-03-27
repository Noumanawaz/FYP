import asyncio
from services.basic_handler import BasicHandler
from services.complex_handler import ComplexHandler
from services.order_handler import OrderHandler

class OrchestratorService:
    def __init__(self, llm_service, rag_system, session_manager=None):
        self.llm_service = llm_service
        self.rag_system = rag_system
        self.session_manager = session_manager
        
        # Initialize specialized agents
        self.basic_agent = BasicHandler(llm_service)
        self.complex_agent = ComplexHandler(llm_service, rag_system)
        self.order_agent = OrderHandler(llm_service, rag_system)
        
    async def handle_query(self, query: str, session_id: str = "default_session") -> dict:
        """
        Processes a query by classifying it and delegating to the right specialized agent.
        Now manages session history and summaries.
        """
        import time
        start_time = time.time()
        print(f"⏱️ [Orchestrator] Starting processing: '{query[:50]}...'")
        
        # 1. Manage Session - Record user message
        if self.session_manager:
            self.session_manager.add_message(session_id, "user", query)
            session_context = self.session_manager.get_context_for_agent(session_id)
            history = session_context.get("history", [])
            summary = session_context.get("summary", "")
        else:
            history = []
            summary = ""
        print(f"⏱️ [Orchestrator] Session context retrieved in {time.time() - start_time:.2f}s")
            
        # 2. Classify
        class_start = time.time()
        category = await self.classify_query(query, session_id)
        print(f"🎯 [Orchestrator] Classified as: {category} in {time.time() - class_start:.2f}s")
        
        # 3. Delegate with context
        delegate_start = time.time()
        result: dict
        if category == "basic":
            result = await self.basic_agent.handle(query, history, summary)
        elif category == "order":
            result = await self.order_agent.handle(query, history, summary, session_id)
        else:
            result = await self.complex_agent.handle(query, history, summary)
        print(f"⏱️ [Orchestrator] Agent handled in {time.time() - delegate_start:.2f}s")
            
        # 4. Manage Session - Record response and update summary
        if self.session_manager:
            assistant_response = result.get("response", "")
            self.session_manager.add_message(session_id, "assistant", assistant_response)
            
            # Fire-and-forget summary update (background task)
            asyncio.create_task(self.update_session_summary(session_id))
            
        print(f"✅ [Orchestrator] Total processing time: {time.time() - start_time:.2f}s")
        return result

    async def classify_query(self, query: str, session_id: str = None) -> str:
        """
        Classifies the query into categories for specialized agent routing (Async).
        Now uses session context for better accuracy.
        """
        if not self.llm_service:
            return "complex"

        # Get context to help classification (especially for confirmations like "yes" or "ok")
        summary = ""
        last_msgs = ""
        if self.session_manager and session_id:
            ctx = self.session_manager.get_context_for_agent(session_id)
            summary = ctx.get("summary", "")
            history = ctx.get("history", [])
            last_msgs = "\n".join([f"{m['role']}: {m['content']}" for m in history[-3:]])

        prompt = f"""You are a query classifier for a restaurant voice assistant.
        
        CONTEXT SUMMARY: {summary}
        RECENT MESSAGES:
        {last_msgs}
        
        Classify the user query into exactly one of these:
        1. GREETING: Simple hellos, goodbyes.
        2. GENERAL: Non-restaurant questions.
        3. ORDER: Intent to place an order, add items, remove items, view cart, or CONFIRM an order (even if it's a short "yes", "ok", or "confirm").
        4. COMPLEX: Menu/restaurant-specific questions.
        
        NEW QUERY: "{query}"
        
        RULES:
        - If query is "yes", "confirm", "ok", and last messages show an order-related question, classify as ORDER.
        - If query mentions food items for ordering, classify as ORDER.
        
        Return ONLY the category name."""

        messages = [{"role": "system", "content": "You are a concise classifier."}, 
                    {"role": "user", "content": prompt}]

        try:
            # Use async call to prevent blocking the event loop
            response = await self.llm_service._call_openai_async(messages, max_tokens=10)
            response = response.strip().upper()
            
            if "GREETING" in response or "GENERAL" in response:
                return "basic"
            elif "ORDER" in response:
                return "order"
            else:
                return "complex"
                
        except Exception as e:
            print(f"⚠️ Orchestrator classification error: {e}")
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

    async def update_session_summary(self, session_id: str):
        """Triggers a summary update if enough new messages are present (Async)"""
        if not self.session_manager or not self.llm_service or not session_id:
            return

        session = self.session_manager.get_session(session_id)
        messages = session.get("messages", [])
        
        # Summarize if we have at least 3 messages and no summary, or every 5 messages
        if len(messages) >= 3:
            try:
                # Get last 10 messages for better summary context
                new_summary = await self.llm_service.generate_summary(session.get("summary", ""), messages[-10:])
                self.session_manager.update_summary(session_id, new_summary)
                print(f"✨ [Orchestrator] Updated summary for {session_id}: {new_summary}")
            except Exception as e:
                print(f"⚠️ Summary update task failed: {e}")

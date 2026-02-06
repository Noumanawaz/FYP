import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from utils.rag_system import MultiRestaurantRAGSystem
from services.llm_service import GroqLLMService
from services.orchestrator_service import OrchestratorService
from services.basic_handler import BasicHandler
from services.order_handler import OrderHandler

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Multi-Restaurant RAG Voice Assistant", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
rag_system = None
llm_service = None
orchestrator_service = None
basic_handler = None
order_handler = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    restaurant_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str  # backwards-compatible (English)
    response_en: str
    response_ur: str
    restaurant_name: str
    confidence: float
    suggestions: List[str]
    response_type: str = "chat"

class SearchRequest(BaseModel):
    query: str
    restaurant_id: Optional[str] = None

class RestaurantInfo(BaseModel):
    id: str
    name: str
    description: str
    specialties: List[str]

# Startup event
@app.on_event("startup")
async def startup_event():
    global rag_system, llm_service, orchestrator_service, basic_handler, order_handler
    
    print("🚀 Starting Multi-Restaurant RAG Voice Assistant...")
    
    try:
        # Initialize RAG system (will use vector DB if available, fallback to JSON)
        rag_system = MultiRestaurantRAGSystem()
        if rag_system.use_vector_db:
            print("✅ Multi-restaurant RAG system initialized with Vector DB")
        else:
            print("✅ Multi-restaurant RAG system initialized with JSON (fallback mode)")
            print("💡 Tip: Run 'python build_vector_db.py' to create vector database from PDFs")
        
        # Initialize LLM service (Groq)
        llm_service = GroqLLMService()
        print("✅ LLM service initialized")

        # Initialize Orchestrator and Handlers
        orchestrator_service = OrchestratorService(llm_service)
        basic_handler = BasicHandler()
        order_handler = OrderHandler()
        print("✅ Orchestrator system initialized")
        
        print(f"🎯 Available restaurants: {[r['name'] for r in rag_system.get_available_restaurants()]}")
        
    except Exception as e:
        print(f"❌ Error during startup: {e}")
        raise

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "rag_system": "initialized" if rag_system else "not_initialized",
        "llm_service": "initialized" if llm_service else "not_initialized",
        "llm_model": getattr(llm_service, "model", None),
        "llm_configured": getattr(llm_service, "is_configured", lambda: False)(),
        "available_restaurants": len(rag_system.get_available_restaurants()) if rag_system else 0,
        "using_vector_db": rag_system.use_vector_db if rag_system else False,
        "vector_db_chunks": rag_system.restaurant_collection.count() if rag_system and rag_system.use_vector_db and rag_system.restaurant_collection else 0
    }

# RAG System Diagnostic endpoint
@app.get("/rag/diagnostic")
async def rag_diagnostic():
    """Diagnostic endpoint to verify RAG system is working correctly"""
    if not rag_system:
        return {"error": "RAG system not initialized"}
    
    diagnostic = {
        "vector_db_enabled": rag_system.use_vector_db,
        "vector_db_initialized": rag_system.restaurant_collection is not None if rag_system.use_vector_db else False,
        "total_chunks": rag_system.restaurant_collection.count() if rag_system.use_vector_db and rag_system.restaurant_collection else 0,
        "restaurants": [r["name"] for r in rag_system.get_available_restaurants()],
        "test_query": None
    }
    
    # Test query to verify retrieval
    if rag_system.use_vector_db:
        try:
            test_result = rag_system.search_vector_db("pizza prices", top_k=3)
            diagnostic["test_query"] = {
                "query": "pizza prices",
                "chunks_retrieved": len(test_result),
                "sample_chunk": {
                    "restaurant": test_result[0]["restaurant_name"] if test_result else None,
                    "similarity": test_result[0]["similarity"] if test_result else None,
                    "content_preview": test_result[0]["content"][:200] if test_result else None,
                    "has_rupees": "Rs." in test_result[0]["content"] if test_result else False
                } if test_result else None
            }
        except Exception as e:
            diagnostic["test_query_error"] = str(e)
    
    return diagnostic

# Get available restaurants
@app.get("/restaurants", response_model=List[RestaurantInfo])
async def get_restaurants():
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    restaurants = []
    for restaurant in rag_system.get_available_restaurants():
        restaurants.append(RestaurantInfo(
            id=restaurant["id"],
            name=restaurant["name"],
            description=restaurant["description"],
            specialties=restaurant["specialties"]
        ))
    
    return restaurants

# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not rag_system or not llm_service:
        raise HTTPException(status_code=500, detail="Services not initialized")
    
    try:

        # Orchestrate the query
        query_type = orchestrator_service.classify_query(request.message)
        print(f"🧠 Query classified as: {query_type}")

        if query_type == "greeting":
            handler_response = basic_handler.handle(request.message)
            return ChatResponse(
                response=handler_response["response"],
                response_en=handler_response["response_en"],
                response_ur=handler_response["response_ur"],
                restaurant_name="Vocabite Assistant",
                confidence=1.0,
                suggestions=[],
                response_type="greeting"
            )

        elif query_type == "order":
            handler_response = order_handler.handle(request.message)
            return ChatResponse(
                response=handler_response["response"],
                response_en=handler_response["response_en"],
                response_ur=handler_response["response_ur"],
                restaurant_name="Vocabite Assistant",
                confidence=1.0,
                suggestions=handler_response.get("suggestions", []),
                response_type="order_placeholder"
            )

        # Process query with the new multi-restaurant system (Complex/RAG)
        rag_result = rag_system.process_query(request.message)
        
        # Log context retrieval for debugging
        context_length = len(rag_result.get('context', ''))
        print(f"📊 RAG Context Length: {context_length} characters")
        print(f"📊 Using Vector DB: {rag_system.use_vector_db}")
        if context_length < 100:
            print("⚠️  WARNING: Context is very short, might not have retrieved relevant information")
        
        # Build prompt for LLM
        detected_restaurants = rag_result.get('detected_restaurants', [])
        query_type_rag = rag_result.get('query_type', 'general') # renamed to avoid conflict
        
        # Generate English response with context
        llm_response_en = llm_service.generate_response(
            user_message=request.message,
            context=rag_result['context']
        )
        
        # Generate Urdu translation
        llm_response_ur = llm_service.generate_response(
            user_message=f"Translate this to Urdu (keep it natural and conversational):\n\n{llm_response_en}"
        )
        
        # Determine primary restaurant for response
        detected_restaurants = rag_result.get('detected_restaurants', [])
        if detected_restaurants:
            primary_restaurant = detected_restaurants[0]['name']
            confidence = detected_restaurants[0]['confidence']
        else:
            primary_restaurant = "Multiple Restaurants"
            confidence = 1.0
        
        return ChatResponse(
            response=llm_response_en,
            response_en=llm_response_en,
            response_ur=llm_response_ur,
            restaurant_name=primary_restaurant,
            confidence=confidence,
            suggestions=rag_result["suggestions"],
            response_type="chat"
        )
        
    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Search endpoint
@app.post("/search")
async def search_menu(request: SearchRequest):
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        restaurant_id = request.restaurant_id  # optional
        results = rag_system.search_menu(request.query, restaurant_id)
        
        return {
            "query": request.query,
            "restaurant_id": restaurant_id,
            "results": results,
            "total_results": len(results)
        }
        
    except Exception as e:
        print(f"❌ Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Restaurant summary endpoint
@app.get("/restaurant/{restaurant_id}/summary")
async def get_restaurant_summary(restaurant_id: str):
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        # Get restaurant data directly
        if restaurant_id in rag_system.restaurant_data:
            restaurant_data = rag_system.restaurant_data[restaurant_id]
            brand = restaurant_data.get("brand", {})
            branches = restaurant_data.get("branches", {})
            
            summary = {
                "name": brand.get("name", restaurant_id),
                "description": brand.get("description", ""),
                "founded": brand.get("founded", ""),
                "cities": branches.get("cities", []),
                "total_branches": branches.get("total_branches", ""),
                "hours": branches.get("hours", "")
            }
            return {"restaurant_id": restaurant_id, "summary": summary}
        else:
            raise HTTPException(status_code=404, detail=f"Restaurant {restaurant_id} not found")
        
    except Exception as e:
        print(f"❌ Error getting restaurant summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time voice communication
@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                user_message = message_data.get("message", "")
                
                # Orchestrate the query
                query_type = orchestrator_service.classify_query(user_message)
                print(f"🧠 [WS] Query classified as: {query_type}")

                if query_type == "greeting":
                    handler_response = basic_handler.handle(user_message)
                    response_data = {
                        "type": "chat_response",
                        "response": handler_response["response"],
                        "response_en": handler_response["response_en"],
                        "response_ur": handler_response["response_ur"],
                        "restaurant_name": "Vocabite Assistant",
                        "confidence": 1.0,
                        "suggestions": [],
                        "response_type": "greeting"
                    }
                    await websocket.send_text(json.dumps(response_data))
                    continue # Skip RAG

                elif query_type == "order":
                    handler_response = order_handler.handle(user_message)
                    response_data = {
                        "type": "chat_response",
                        "response": handler_response["response"],
                        "response_en": handler_response["response_en"],
                        "response_ur": handler_response["response_ur"],
                        "restaurant_name": "Vocabite Assistant",
                        "confidence": 1.0,
                        "suggestions": handler_response.get("suggestions", []),
                        "response_type": "order_placeholder"
                    }
                    await websocket.send_text(json.dumps(response_data))
                    continue # Skip RAG

                # Process with RAG system
                rag_result = rag_system.process_query(user_message)
                
                # Log context retrieval for debugging
                context_length = len(rag_result.get('context', ''))
                print(f"📊 [WS] RAG Context Length: {context_length} characters")
                
                # Build prompt for LLM
                detected_restaurants = rag_result.get('detected_restaurants', [])
                query_type_rag = rag_result.get('query_type', 'general')
                
                # Generate English response with context
                llm_response_en = llm_service.generate_response(
                    user_message=user_message,
                    context=rag_result['context']
                )
                
                # Generate Urdu translation
                llm_response_ur = llm_service.generate_response(
                    user_message=f"Translate this to Urdu (keep it natural and conversational):\n\n{llm_response_en}"
                )
                
                # Determine primary restaurant for response
                detected_restaurants = rag_result.get('detected_restaurants', [])
                if detected_restaurants:
                    primary_restaurant = detected_restaurants[0]['name']
                    confidence = detected_restaurants[0]['confidence']
                else:
                    primary_restaurant = "Multiple Restaurants"
                    confidence = 1.0
                
                # Send response back to client
                response_data = {
                    "type": "chat_response",
                    "response": llm_response_en,  # backward compatible
                    "response_en": llm_response_en,
                    "response_ur": llm_response_ur,
                    "restaurant_name": primary_restaurant,
                    "confidence": confidence,
                    "suggestions": rag_result["suggestions"],
                    "response_type": "chat"
                }
                
                await websocket.send_text(json.dumps(response_data))
                
            # Restaurant switching is now handled automatically in multi-restaurant queries
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        error_data = {
            "type": "error",
            "message": str(e)
        }
        await websocket.send_text(json.dumps(error_data))

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    print(f"🚀 Starting Multi-Restaurant RAG Voice Assistant on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )

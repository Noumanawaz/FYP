import os
# CRITICAL: Prevent PyTorch/SentenceTransformers from hanging the event loop on macOS
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json
import asyncio
import tempfile
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from utils.rag_system import MultiRestaurantRAGSystem
from services.llm_service import OpenAILLMService
# Imports kept but logic simplified for reliability as requested
from services.orchestrator_service import OrchestratorService
from services.session_service import SessionManager
from build_vector_db import VectorDBBuilder
from services import neon_vector_store

load_dotenv()

from contextlib import asynccontextmanager

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_system, llm_service, db_builder
    
    print("🚀 Starting Multi-Restaurant RAG Voice Assistant...")
    
    try:
        # Initialize RAG system
        rag_system = MultiRestaurantRAGSystem()
        print(f"✅ RAG initialized. Vector DB: {rag_system.use_vector_db}")
        
        # Ensure NeonDB schema is up to date
        neon_vector_store.setup_table()
        
        # Initialize LLM service (OpenAI)
        llm_service = OpenAILLMService()
        print(f"✅ LLM initialized with model: {llm_service.model}")
        
        # Initialize Vector DB Builder for ingestion
        db_builder = VectorDBBuilder()
        print("✅ Vector DB Builder initialized for ingestion")
        
    except Exception as e:
        print(f"❌ Error during startup: {e}")
        
    yield
    # Shutdown logic can go here if needed
    print("👋 Shutting down Multi-Restaurant RAG Voice Assistant...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Multi-Restaurant RAG Voice Assistant", 
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
rag_system = None
llm_service = None
db_builder = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

manager = ConnectionManager()

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    restaurant_id: Optional[str] = None
    session_id: Optional[str] = "default_session"

class ChatResponse(BaseModel):
    response: str
    response_en: str
    response_ur: str
    restaurant_name: str
    confidence: float
    suggestions: List[str]
    response_type: str = "chat"

@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if rag_system and llm_service else "initializing",
        "rag": "ready" if rag_system else "pending",
        "llm": "ready" if llm_service else "pending"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not rag_system or not llm_service:
        raise HTTPException(status_code=503, detail="System initializing")
    
    try:
        print(f"💬 Chat: {request.message}")
        
        # 1. RAG Context Retrieval (Offload to thread to keep loop free)
        rag_result = await asyncio.to_thread(rag_system.process_query, request.message)
        context = rag_result.get('context', '')
        
        # 2. Dual LLM Response (EN + UR in one call)
        responses = await llm_service.generate_dual_response(request.message, context)
        llm_response_en = responses['en']
        llm_response_ur = responses['ur']
        
        # Metadata
        detected = rag_result.get('detected_restaurants', [])
        primary_restaurant = detected[0]['name'] if detected else "Assistant"
        confidence = detected[0]['confidence'] if detected else 1.0
        
        return ChatResponse(
            response=llm_response_en,
            response_en=llm_response_en,
            response_ur=llm_response_ur,
            restaurant_name=primary_restaurant,
            confidence=confidence,
            suggestions=rag_result.get("suggestions", []),
            response_type="chat"
        )
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest-restaurant")
async def ingest_restaurant(
    file: UploadFile = File(...),
    restaurant_id: str = Form(...),
    restaurant_name: str = Form(...)
):
    """
    Ingest a restaurant's PDF/TXT information into the RAG system.
    Extracts text, creates embeddings, and stores in NeonDB and ChromaDB.
    """
    if not db_builder:
        raise HTTPException(status_code=503, detail="DB Builder not initialized")
    
    # Check file extension
    filename = file.filename
    if not (filename.lower().endswith('.pdf') or filename.lower().endswith('.txt')):
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported")
    
    try:
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        
        # Process the file
        print(f"📥 Processing ingest request for {restaurant_name} ({restaurant_id})")
        result = await asyncio.to_thread(
            db_builder.ingest_single_file, 
            tmp_path, 
            restaurant_id, 
            restaurant_name
        )
        
        # Clean up
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
            
        if result.get("success"):
            return {
                "success": True,
                "message": f"Successfully ingested {restaurant_name}",
                "chunks_created": result.get("chunks_created", 0),
                "neon_synced": result.get("neon_synced", False)
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown ingestion error"))
            
    except Exception as e:
        print(f"❌ Ingestion Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print("🔌 WS Connected")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "chat":
                text = msg.get("message", "")
                
                # 1. RAG Context Retrieval (Offload to thread)
                rag_result = await asyncio.to_thread(rag_system.process_query, text)
                context = rag_result.get('context', '')
                
                # 2. Dual LLM Response (Async combined call)
                responses = await llm_service.generate_dual_response(text, context)
                resp_en = responses['en']
                resp_ur = responses['ur']
                
                detected = rag_result.get('detected_restaurants', [])
                
                await websocket.send_text(json.dumps({
                    "type": "chat_response",
                    "response": resp_en,
                    "response_en": resp_en,
                    "response_ur": resp_ur,
                    "restaurant_name": detected[0]['name'] if detected else "Assistant",
                    "confidence": detected[0]['confidence'] if detected else 1.0,
                    "suggestions": rag_result.get("suggestions", []),
                    "response_type": "chat"
                }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("🔌 WS Disconnected")
    except Exception as e:
        print(f"❌ WS Error: {e}")
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

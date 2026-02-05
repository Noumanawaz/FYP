#!/usr/bin/env python3
"""
Setup script for Cheezious RAG Voice Assistant
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False
    return True

def create_env_file():
    """Create .env file from template"""
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists() and env_example.exists():
        print("🔧 Creating .env file from template...")
        try:
            with open(env_example, 'r') as f:
                content = f.read()
            
            with open(env_file, 'w') as f:
                f.write(content)
            
            print("✅ .env file created! Please update it with your OpenRouter API key.")
            print("📝 Edit .env file and set OPENROUTER_API_KEY=your_actual_api_key")
        except Exception as e:
            print(f"❌ Error creating .env file: {e}")
            return False
    elif env_file.exists():
        print("✅ .env file already exists")
    else:
        print("⚠️  No env.example file found")
    
    return True

def check_data_files():
    """Check if required data files exist"""
    print("📁 Checking data files...")
    
    data_file = Path("data/cheezious_data.json")
    if not data_file.exists():
        print("❌ data/cheezious_data.json not found!")
        return False
    
    print("✅ Data files found")
    return True

def test_rag_system():
    """Test the RAG system initialization"""
    print("🧪 Testing RAG system...")
    try:
        from utils.rag_system import CheeziousRAGSystem
        rag = CheeziousRAGSystem()
        print("✅ RAG system initialized successfully!")
        
        # Test search functionality
        results = rag.search_menu("pizza", top_k=3)
        print(f"✅ Search test successful - found {len(results)} results")
        
        return True
    except Exception as e:
        print(f"❌ RAG system test failed: {e}")
        return False

def test_llm_service():
    """Test the LLM service (without API key)"""
    print("🤖 Testing LLM service...")
    try:
        from services.llm_service import OpenRouterLLMService
        # This will fail without API key, but we can test the class structure
        print("✅ LLM service class loaded successfully!")
        print("⚠️  API key required for full functionality")
        return True
    except Exception as e:
        print(f"❌ LLM service test failed: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    print("📂 Creating directories...")
    directories = [
        "data",
        "chroma_db",
        "logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print("✅ Directories created")

def main():
    """Main setup function"""
    print("🚀 Setting up Cheezious RAG Voice Assistant...")
    print("=" * 50)
    
    # Create directories
    create_directories()
    
    # Check data files
    if not check_data_files():
        print("❌ Setup failed: Missing data files")
        return False
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Setup failed: Could not install dependencies")
        return False
    
    # Create .env file
    if not create_env_file():
        print("❌ Setup failed: Could not create .env file")
        return False
    
    # Test RAG system
    if not test_rag_system():
        print("❌ Setup failed: RAG system test failed")
        return False
    
    # Test LLM service
    if not test_llm_service():
        print("❌ Setup failed: LLM service test failed")
        return False
    
    print("=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit .env file and add your OpenRouter API key")
    print("2. Run: python main.py")
    print("3. Open http://localhost:8000/docs for API documentation")
    print("4. Connect your frontend to ws://localhost:8000/ws/voice for WebSocket")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

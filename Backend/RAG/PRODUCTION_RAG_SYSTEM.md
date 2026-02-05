# Production-Grade RAG System Documentation

## Overview

This is a **production-ready, industry-standard RAG (Retrieval-Augmented Generation) system** built for real-world deployment. It implements best practices from leading RAG architectures.

## Architecture

### Core Components

1. **Query Processor** (`utils/query_processor.py`)
   - Advanced query preprocessing
   - Filler word removal
   - Key term extraction
   - Query expansion with synonyms
   - Entity extraction

2. **Hybrid Search** (`utils/rag_system.py`)
   - Semantic search (vector similarity)
   - Keyword matching (via reranker)
   - Multi-signal retrieval

3. **Re-ranker** (`utils/reranker.py`)
   - Multi-signal relevance scoring
   - Keyword matching
   - Query type detection
   - Metadata boosting

4. **Context Builder**
   - Intelligent chunk selection
   - Diversity filtering (avoid duplicates)
   - Full content usage (no truncation)
   - Restaurant-specific grouping

## Key Features

### 1. Proper Distance-to-Similarity Conversion

**Problem**: ChromaDB uses L2 (Euclidean) distance, not cosine similarity.

**Solution**: 
```python
def _l2_to_similarity(self, distance: float) -> float:
    """Convert L2 distance to similarity: similarity = 1 / (1 + distance)"""
    return 1.0 / (1.0 + distance)
```

This properly converts L2 distances (0.74-1.25 range) to similarity scores (0.44-0.57 range).

### 2. Query Preprocessing

- Removes conversational fillers: "hi", "can you", "tell me"
- Extracts key terms: restaurants, food items, quantities
- Creates optimized search queries
- Example: "hi can you tell me KFC deals" → "KFC deals"

### 3. Hybrid Search

- **Semantic Search**: Vector similarity using embeddings
- **Keyword Matching**: Via reranker for exact matches
- **Combined Scoring**: 40% semantic + 60% rerank score

### 4. Re-ranking

Multi-signal relevance scoring:
- **Semantic Similarity** (40%): Base embedding similarity
- **Keyword Matching** (30%): Exact term matches
- **Query Type Matching** (20%): Price/deal/menu detection
- **Metadata Boost** (10%): Restaurant name, type matching

### 5. Intelligent Context Building

- **Diversity Filtering**: Avoids duplicate/near-duplicate chunks
- **Score-Based Selection**: Uses final_score (semantic + rerank)
- **Full Content**: No truncation, uses complete chunks
- **Optimal Count**: Top 8 diverse chunks per restaurant

### 6. Production-Grade Chunking

- **Sentence-Aware**: Splits at sentence boundaries
- **Optimal Size**: 600 characters (~150 words) per chunk
- **Proper Overlap**: 150 characters (~30 words) for context
- **Noise Filtering**: Removes chunks < 50 characters

## How It Works

### Query Flow

```
User Query
    ↓
[Query Processor]
  - Remove fillers
  - Extract key terms
  - Create search query
    ↓
[Hybrid Search]
  - Semantic search (vector DB)
  - Get top 2K-3K candidates
    ↓
[Re-ranker]
  - Calculate multi-signal scores
  - Combine semantic + keyword
  - Sort by final_score
    ↓
[Context Builder]
  - Select top 8 diverse chunks
  - Group by restaurant
  - Build context string
    ↓
[LLM Generation]
  - Prompt with context
  - Generate response
  - Translate to Urdu
```

### Example Query Processing

**Input**: "hi can you tell me some deals on KFC and also let me know the prices"

**Step 1 - Query Processing**:
- Removed: "hi", "can you", "tell me", "also", "let me know"
- Key terms: ["KFC", "deals", "prices"]
- Search query: "KFC deals prices"

**Step 2 - Vector Search**:
- Searches vector DB with "KFC deals prices"
- Retrieves 20-30 candidate chunks
- Converts L2 distances to similarities

**Step 3 - Re-ranking**:
- Calculates keyword matches (KFC, deals, prices)
- Detects query type: "deals" + "prices"
- Boosts chunks with price/deal information
- Combines scores: 40% semantic + 60% rerank

**Step 4 - Context Building**:
- Selects top 8 diverse chunks
- Groups by restaurant
- Builds context: "=== KFC ===\n[chunk 1]\n---\n[chunk 2]..."

**Step 5 - LLM Generation**:
- Prompt includes context with explicit instructions
- LLM generates response using context
- Prices preserved in Rupees (Rs.)

## Performance Optimizations

1. **Efficient Retrieval**: Retrieves 2-3x more candidates, reranks to top-K
2. **Diversity Filtering**: Prevents duplicate information in context
3. **Score Combination**: Balances semantic and keyword signals
4. **Error Handling**: Graceful fallbacks at every stage

## Quality Guarantees

1. **Accuracy**: Uses ONLY retrieved context, no hallucination
2. **Currency Preservation**: Explicit instructions to use Rs. format
3. **Relevance**: Multi-signal scoring ensures best chunks
4. **Completeness**: Full chunk content, no truncation
5. **Diversity**: Avoids redundant information

## Testing

### Verify System is Working

1. **Check Vector DB**:
   ```bash
   curl http://localhost:8000/rag/diagnostic
   ```

2. **Test Query**:
   - Ask: "What are KFC deals and prices?"
   - Check logs for: retrieval, reranking, context building
   - Verify response uses Rs. (not $)

3. **Monitor Logs**:
   - Look for: "🔍 Processed query", "🔄 Re-ranking", "📝 Building context"
   - Verify: chunks retrieved, scores calculated, context built

## Industry Standards Implemented

✅ **Hybrid Search**: Semantic + Keyword  
✅ **Re-ranking**: Multi-signal relevance  
✅ **Query Preprocessing**: Filler removal, expansion  
✅ **Diversity Filtering**: Avoid duplicates  
✅ **Proper Distance Conversion**: L2 to similarity  
✅ **Error Handling**: Graceful fallbacks  
✅ **Full Context Usage**: No truncation  
✅ **Production Logging**: Comprehensive debugging  

This is a **production-ready RAG system** that follows industry best practices!


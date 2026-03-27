import json
import os
from typing import Dict, List, Tuple, Optional
import re
import numpy as np
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Import production-grade utilities
from .query_processor import QueryProcessor
from .reranker import Reranker
from .context_filter import ContextFilter
from services import neon_vector_store

# Minimum similarity threshold - using adaptive threshold based on results
# We'll use top-K ranking with reranking instead of strict filtering
MIN_SIMILARITY_THRESHOLD = -0.5  # Allow negative similarities, reranker will handle quality

class MultiRestaurantRAGSystem:
    def __init__(self, data_dir: str = "data", vector_db_dir: str = "vector_db", use_vector_db: bool = True):
        self.data_dir = data_dir
        self.vector_db_dir = vector_db_dir
        self.use_vector_db = use_vector_db # Should always be True in production
        self.restaurant_index = {"restaurants": [], "default_restaurant": "cheezious"}
        
        # Initialize vector DB components
        self.vector_client = None
        self.restaurant_collection = None
        self.index_collection = None
        self.embedding_model = None
        
        # Initialize production-grade components
        self.query_processor = QueryProcessor()
        self.reranker = Reranker()
        self.context_filter = ContextFilter()
        
        # Load restaurant index STRICTLY from DB
        self.load_restaurant_index()
        
        # Try to initialize vector DB
        if self.use_vector_db:
            try:
                self._initialize_vector_db()
                print("✅ Vector database initialized")
            except Exception as e:
                print(f"⚠️  Vector DB initialization failed: {e}")
                # We do NOT fallback to JSON anymore
    
    def _initialize_vector_db(self):
        """Initialize ChromaDB client and collections"""
        if not os.path.exists(self.vector_db_dir):
            # In production, we might want to log this but keep going if NeonDB is primary
            print(f"⚠️ Vector DB directory not found: {self.vector_db_dir}")
        
        try:
            # Initialize embedding model (force CPU for stability on Mac)
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
            print(f"✅ Embedding model loaded")
        except Exception as e:
            raise Exception(f"Failed to load embedding model: {e}")
    
    def load_restaurant_index(self):
        """Load the restaurant index STRICTLY from NeonDB (restaurant_embeddings table)"""
        try:
            # Clear existing index to ensure consistency with DB
            self.restaurant_index = {"restaurants": [], "default_restaurant": "cheezious"}
            
            # Load from NeonDB
            try:
                # We need names and IDs from restaurant_embeddings table
                conn = neon_vector_store._get_conn()
                with conn.cursor() as cur:
                    cur.execute("SELECT DISTINCT restaurant_id, restaurant_name FROM restaurant_embeddings")
                    db_restaurants = cur.fetchall()
                conn.close()

                for rid, rname in db_restaurants:
                    name_clean = rname.strip()
                    self.restaurant_index["restaurants"].append({
                        "id": rid,
                        "name": name_clean,
                        "keywords": [name_clean.lower(), rid.lower()],
                        "dynamic": True
                    })
                    print(f"✅ Synced {name_clean} from database to RAG index")
            except Exception as e:
                print(f"❌ Failed to fetch restaurants from DB: {e}")

            print(f"✅ Loaded total of {len(self.restaurant_index['restaurants'])} restaurants from database")
        except Exception as e:
            print(f"❌ Error loading restaurant index: {e}")
            self.restaurant_index = {"restaurants": [], "default_restaurant": "cheezious"}
    
    def load_all_restaurants(self):
        """No longer used as we are strictly DB-only"""
        pass
    
    def detect_restaurants_in_query(self, query: str) -> List[Dict]:
        """
        Detect all restaurants mentioned in a single query using professional multi-restaurant detection
        Returns list of restaurant info with confidence scores
        """
        query_lower = query.lower()
        detected_restaurants = []
        
        print(f"🔍 Analyzing query for multiple restaurants: '{query}'")
        
        # First, check for explicit restaurant name mentions
        explicit_restaurants = self._detect_explicit_restaurant_mentions(query_lower)
        
        # Then, check for food category matches across all restaurants
        food_category_restaurants = self._detect_food_category_matches(query_lower)
        
        # Combine and deduplicate results
        all_detected = {}
        
        # Add explicit restaurant mentions (higher priority)
        for restaurant in explicit_restaurants:
            all_detected[restaurant["id"]] = restaurant
        
        # Add food category matches (lower priority, but still important)
        for restaurant in food_category_restaurants:
            if restaurant["id"] in all_detected:
                # If already detected explicitly, boost confidence
                all_detected[restaurant["id"]]["confidence"] += restaurant["confidence"]
                all_detected[restaurant["id"]]["detection_type"] = "explicit_and_category"
            else:
                # New detection from food category
                restaurant["detection_type"] = "food_category"
                all_detected[restaurant["id"]] = restaurant
        
        # Convert back to list and sort by confidence
        detected_restaurants = list(all_detected.values())
        detected_restaurants.sort(key=lambda x: x["confidence"], reverse=True)
        
        print(f"🎯 Detected restaurants: {[r['name'] for r in detected_restaurants]}")
        for restaurant in detected_restaurants:
            print(f"   - {restaurant['name']}: {restaurant['confidence']:.2f} ({restaurant.get('detection_type', 'unknown')})")
        
        return detected_restaurants
    
    def _detect_explicit_restaurant_mentions(self, query_lower: str) -> List[Dict]:
        """Detect explicit restaurant name mentions in the query"""
        explicit_restaurants = []
        
        for restaurant in self.restaurant_index.get("restaurants", []):
            restaurant_id = restaurant["id"]
            restaurant_name = restaurant["name"]
            confidence = 0.0
            keywords_found = []
            
            # Check for direct restaurant name mentions (highest priority)
            for keyword in restaurant.get("keywords", []):
                if keyword.lower() in query_lower:
                    confidence += 2.0  # Higher weight for explicit mentions
                    keywords_found.append(keyword)
                    print(f"✅ Found explicit restaurant keyword '{keyword}' for {restaurant_name}")
            
            if confidence > 0:
                explicit_restaurants.append({
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "confidence": confidence,
                    "keywords_found": keywords_found,
                    "detection_type": "explicit"
                })
        
        return explicit_restaurants
    
    def _detect_food_category_matches(self, query_lower: str) -> List[Dict]:
        """Detect restaurants based on food categories mentioned in the query"""
        food_category_restaurants = []
        
        # Define food category mappings
        food_categories = {
            "pizza": ["pizza", "margherita", "pepperoni", "pan pizza", "stuffed crust"],
            "burger": ["burger", "cheeseburger", "chicken burger", "beef burger"],
            "chicken": ["chicken", "fried chicken", "grilled chicken", "chicken wings", "zinger"],
            "pasta": ["pasta", "spaghetti", "macaroni", "penne", "fettuccine"],
            "sandwich": ["sandwich", "sub", "wrap", "panini"],
            "rice": ["rice", "biryani", "fried rice", "pulao"],
            "dessert": ["dessert", "ice cream", "cake", "sweet", "chocolate"],
            "drink": ["drink", "beverage", "juice", "soda", "coffee", "tea"],
            "combo": ["combo", "meal", "deal", "package", "set"]
        }
        
        # Find which food categories are mentioned in the query
        mentioned_categories = []
        for category, keywords in food_categories.items():
            for keyword in keywords:
                if keyword in query_lower:
                    mentioned_categories.append(category)
                    break
        
        print(f"🍽️ Detected food categories: {mentioned_categories}")
        
        # Check each restaurant for these food categories
        for restaurant in self.restaurant_index.get("restaurants", []):
            restaurant_id = restaurant["id"]
            restaurant_name = restaurant["name"]
            confidence = 0.0
            matching_categories = []
            
            # Check if restaurant has items in the mentioned categories
            food_cats = restaurant.get("food_categories", [])
            for category in mentioned_categories:
                if category in food_cats:
                    confidence += 1.0
                    matching_categories.append(category)
                    print(f"✅ {restaurant_name} has {category} items")
            
            if confidence > 0:
                food_category_restaurants.append({
                    "id": restaurant_id,
                    "name": restaurant_name,
                    "confidence": confidence,
                    "matching_categories": matching_categories,
                    "detection_type": "food_category"
                })
        
        return food_category_restaurants
    
    def _l2_to_similarity(self, distance: float) -> float:
        """
        Convert L2 (Euclidean) distance to similarity score.
        ChromaDB uses L2 distance by default for embeddings.
        Similarity = 1 / (1 + distance) for normalized embeddings
        """
        # For normalized embeddings, L2 distance ranges roughly 0-2
        # Convert to similarity using inverse relationship
        if distance <= 0:
            return 1.0
        # Use sigmoid-like function for better distribution
        similarity = 1.0 / (1.0 + distance)
        return max(0.0, similarity)
    
    def _hybrid_search(self, query: str, restaurant_ids: Optional[List[str]] = None, top_k: int = 15) -> List[Dict]:
        """
        Hybrid search combining semantic and keyword matching for production-grade retrieval
        """
        if not self.use_vector_db or not self.restaurant_collection:
            return []
        
        # Process query using production-grade processor
        processed_query = self.query_processor.create_search_query(query)
        query_terms = self.query_processor.extract_key_terms(query)['food_terms']
        query_terms.extend(self.query_processor.extract_key_terms(query)['restaurants'])
        
        print(f"🔍 Original: '{query}'")
        print(f"🔍 Processed: '{processed_query}'")
        print(f"🔍 Key terms: {query_terms}")
        
        # Build where clause
        where_clause = {}
        if restaurant_ids and len(restaurant_ids) == 1:
            where_clause = {"restaurant_id": restaurant_ids[0]}
        elif restaurant_ids:
            where_clause = None
        
        # Semantic search using NeonDB (pgvector)
        # Increase search_k to ensure we find chunks with prices when user asks about prices
        query_lower = query.lower()
        if any(kw in query_lower for kw in ['price', 'prices', 'cost', 'how much', 'deal']):
            # For price/deal queries, search more chunks to find ones with prices
            search_k = min(top_k * 3, 20)
        else:
            search_k = min(top_k * 2, 15) if restaurant_ids and len(restaurant_ids) > 1 else min(top_k * 2, 10)
        
        retrieved_chunks = []
        try:
            # Generate embedding for the query
            query_embedding = self.embedding_model.encode(processed_query)
            
            # Determine target restaurant_id (if single)
            target_rid = None
            if restaurant_ids and len(restaurant_ids) == 1:
                target_rid = restaurant_ids[0]
            
            db_results = neon_vector_store.search_similar(
                query_embedding=query_embedding,
                top_k=search_k,
                restaurant_id=target_rid
            )
            
            if db_results:
                print(f"📊 Found {len(db_results)} chunks from NeonDB semantic search")
                for row in db_results:
                    # Filter by restaurant_ids if multiple specified
                    if restaurant_ids and len(restaurant_ids) > 1:
                        if row["restaurant_id"] not in restaurant_ids:
                            continue
                    
                    similarity = float(row["similarity"])
                    
                    # Only filter extremely poor matches
                    if similarity < MIN_SIMILARITY_THRESHOLD:
                        continue
                    
                    metadata = {
                        "restaurant_id": row["restaurant_id"],
                        "restaurant_name": row["restaurant_name"],
                        "chunk_index": row["chunk_index"],
                        "pdf_filename": row["pdf_filename"]
                    }
                    
                    retrieved_chunks.append({
                        "restaurant_id": row["restaurant_id"],
                        "restaurant_name": row["restaurant_name"],
                        "content": row["content"],
                        "similarity": similarity,
                        "metadata": metadata
                    })
        except Exception as e:
            print(f"❌ Error in vector search: {e}")
            import traceback
            traceback.print_exc()
            return []
            
        # Re-rank chunks using production-grade reranker
        if retrieved_chunks:
            print(f"🔄 Re-ranking {len(retrieved_chunks)} chunks...")
            reranked_chunks = self.reranker.rerank(retrieved_chunks, query, query_terms)
            
            # Update similarity with rerank score for final sorting
            for chunk in reranked_chunks:
                # Combine semantic similarity (40%) with rerank score (60%)
                chunk['final_score'] = (chunk['similarity'] * 0.4) + (chunk['rerank_score'] * 0.6)
            
            # Sort by final score
            reranked_chunks.sort(key=lambda x: x['final_score'], reverse=True)
            
            # Return top_k, but limit to 5 max for phone-call style (concise responses)
            final_chunks = reranked_chunks[:min(top_k, 5)]
            print(f"✅ Returning {len(final_chunks)} top-ranked chunks")
            for i, chunk in enumerate(final_chunks[:3]):  # Log top 3
                print(f"  {i+1}. {chunk['restaurant_name']} (score: {chunk['final_score']:.3f}, similarity: {chunk['similarity']:.3f}, rerank: {chunk['rerank_score']:.3f})")
            
            return final_chunks
        
        return []
    
    def search_vector_db(self, query: str, restaurant_ids: Optional[List[str]] = None, top_k: int = 10) -> List[Dict]:
        """
        Production-grade vector database search with hybrid retrieval and reranking
        """
        try:
            return self._hybrid_search(query, restaurant_ids, top_k)
        except Exception as e:
            print(f"❌ Error in vector DB search: {e}")
            import traceback
            traceback.print_exc()
            # Return empty list on error, system will fall back gracefully
            return []
    
    def search_comprehensive_info(self, query: str, restaurant_ids: List[str] = None) -> Dict:
        """
        Search for comprehensive information across multiple restaurants
        Uses vector DB if available, falls back to JSON
        """
        if restaurant_ids is None:
            restaurant_ids = [r["id"] for r in self.restaurant_index.get("restaurants", [])]
        
        comprehensive_results = {
            "query": query,
            "restaurants_searched": restaurant_ids,
            "results": {},
            "summary": ""
        }
        
        if self.use_vector_db:
            # Use production-grade hybrid search with error handling
            try:
                retrieved_chunks = self.search_vector_db(query, restaurant_ids, top_k=20)
            except Exception as e:
                print(f"❌ Error in comprehensive search: {e}")
                retrieved_chunks = []
            
            # Group similarity chunks by restaurant
            restaurant_chunks = {}
            for chunk in retrieved_chunks:
                rid = chunk["restaurant_id"]
                if rid not in restaurant_chunks:
                    restaurant_chunks[rid] = []
                restaurant_chunks[rid].append(chunk)

            # Build results structure
            for rid in restaurant_ids:
                # Find the name for this rid
                restaurant_name = next(
                    (r["name"] for r in self.restaurant_index.get("restaurants", []) if r["id"] == rid),
                    rid
                )
                
                # Determine if we should get ALL chunks (broad query)
                is_broad_query = any(kw in query.lower() for kw in ['menu', 'options', 'list', 'all', 'what do you have', 'items'])
                
                chunks = []
                if is_broad_query:
                    print(f"📄 Fetching ALL chunks for {restaurant_name} (Broad Query)")
                    chunks = neon_vector_store.get_restaurant_chunks(rid)
                else:
                    # Filter retrieved chunks for this restaurant
                    chunks = restaurant_chunks.get(rid, [])
                    # If few chunks, supplement slightly
                    if len(chunks) < 3:
                        more_chunks = neon_vector_store.get_restaurant_chunks(rid)
                        
                        # Helper to get chunk index correctly regardless of source
                        def get_idx(c):
                            if 'chunk_index' in c: return c['chunk_index']
                            return c.get('metadata', {}).get('chunk_index')
                            
                        existing_indices = {get_idx(c) for c in chunks if get_idx(c) is not None}
                        for mc in more_chunks:
                            if mc.get('chunk_index') not in existing_indices:
                                chunks.append(mc)
                                if len(chunks) >= 8: break
                
                # Extract meta info
                menu_items = []
                deals = []
                general_info = {}
                location_info = {}
                
                for chunk in chunks:
                    content = chunk["content"]
                    tag = chunk.get("meta_tag")
                    if tag == "menu items":
                        if any(w in content.lower() for w in ["deal", "offer", "combo"]):
                            deals.append({"name": "Deal", "description": content})
                        else:
                            price_m = re.search(r'rs\.?\s*(\d+)', content.lower())
                            price = f"Rs. {price_m.group(1)}" if price_m else "Price N/A"
                            menu_items.append({"name": "Item", "price": price, "description": content})
                    elif tag in ["general information", "restaurant identity"]:
                        general_info[f"info_{len(general_info)}"] = content
                    elif tag == "location information":
                        location_info[f"info_{len(location_info)}"] = content
                
                comprehensive_results["results"][rid] = {
                    "name": restaurant_name,
                    "data": {
                        "menu_items": menu_items[:15],
                        "deals": deals[:10],
                        "general_info": general_info,
                        "location_info": location_info,
                        "chunks": chunks
                    }
                }
        
        return comprehensive_results
    
    def _calculate_relevance(self, query: str, item: Dict) -> float:
        """Calculate relevance score for a menu item or information"""
        score = 0.0
        return score
    
    def build_comprehensive_context(self, search_results: Dict, focus_restaurant: Optional[str] = None) -> str:
        """Build comprehensive context - only include focused restaurant if specified"""
        context_parts = []
        query = search_results.get("query", "").lower()
        
        # If user asked about a specific restaurant, only include that one
        restaurants_to_include = search_results["results"]
        if focus_restaurant:
            # Filter to only the focused restaurant
            restaurants_to_include = {
                rid: info for rid, info in search_results["results"].items()
                if rid.lower() == focus_restaurant.lower() or info["name"].lower() == focus_restaurant.lower()
            }
            # If we found the focused restaurant, use only that
            if restaurants_to_include:
                print(f"🎯 Focusing on {focus_restaurant} - excluding other restaurants")
            else:
                print(f"⚠️  Focus restaurant {focus_restaurant} not found in results, using all restaurants")
                restaurants_to_include = search_results["results"]
        
        for restaurant_id, restaurant_info in restaurants_to_include.items():
            restaurant_name = restaurant_info["name"]
            data = restaurant_info["data"]
            
            context_parts.append(f"=== {restaurant_name.upper()} ===")
            
            # If using vector DB, use chunks directly with intelligent selection
            if self.use_vector_db and "chunks" in data:
                chunks = data.get("chunks", [])
                
                if chunks:
                    # Use final_score if available (from reranking), otherwise similarity
                    scored_chunks = sorted(
                        chunks,
                        key=lambda x: x.get('final_score', x.get('similarity', 0)),
                        reverse=True
                    )
                    
                    # Select top chunks with diversity (avoid duplicates)
                    selected_chunks = []
                    seen_content_prefixes = set()
                    
                    # For broad queries, we include more context
                    is_broad_query = any(kw in query for kw in ['menu', 'options', 'list', 'all', 'what do you have'])
                    max_chunks = 15 if is_broad_query else 5
                    
                    for chunk in scored_chunks:
                        content_sig = chunk["content"][:100].lower()
                        if content_sig not in seen_content_prefixes:
                            selected_chunks.append(chunk)
                            seen_content_prefixes.add(content_sig)
                            if len(selected_chunks) >= max_chunks:
                                break
                    
                    if selected_chunks:
                        print(f"📝 Building context for {restaurant_name}: {len(selected_chunks)} chunks")
                        # Use full chunk content (not filtered) for better context
                        # Clean up the context to help with price extraction
                        relevant_text = "\n\n---\n\n".join([chunk["content"] for chunk in selected_chunks])
                        # Fix common price formatting issues (Rs. , 249 -> Rs. 1,249)
                        # This helps the LLM extract prices better
                        relevant_text = re.sub(r'Rs\.\s*,\s*(\d+)', r'Rs. \1', relevant_text)
                        
                        if relevant_text:
                            context_parts.append(relevant_text)
                            print(f"  ✅ Added {len(relevant_text)} characters of context")
                    else:
                        print(f"  ⚠️  No diverse chunks selected for {restaurant_name}")
                else:
                    print(f"  ⚠️  No chunks found for {restaurant_name}")
            
            context_parts.append("")  # Empty line between restaurants
        
        return "\n".join(context_parts)

    def search_menu(self, query: str, restaurant_id: Optional[str] = None) -> List[Dict]:
        """Search menu items across one or all restaurants and return flat results."""
        results: List[Dict] = []
        query_lower = query.lower()

        target_ids: List[str]
        if restaurant_id and restaurant_id in [r["id"] for r in self.restaurant_index.get("restaurants", [])]:
            target_ids = [restaurant_id]
        else:
            target_ids = [r["id"] for r in self.restaurant_index.get("restaurants", [])]

        if self.use_vector_db:
            # Use vector DB search
            retrieved_chunks = self.search_vector_db(query, target_ids, top_k=20)
            
            for chunk in retrieved_chunks:
                # Extract structured information from chunk
                content = chunk["content"]
                meta_tag = chunk.get("meta_tag", "menu")
                
                # Extract price if available
                price_match = re.search(r'rs\.?\s*(\d+)', content, re.IGNORECASE)
                price = f"Rs. {price_match.group(1)}" if price_match else "Price N/A"
                
                # Extract item name (try to find it in content)
                lines = content.split('\n')
                item_name = lines[0][:50] if lines else "Item from PDF"
                
                results.append({
                    "restaurant_id": chunk["restaurant_id"],
                    "restaurant_name": chunk["restaurant_name"],
                    "section": meta_tag,
                    "item": {
                        "name": item_name,
                        "price": price,
                        "description": content
                    },
                    "relevance": chunk["similarity"]
                })
        results.sort(key=lambda x: x["relevance"], reverse=True)
        return results
    
    def process_query(self, query: str, summary: str = "") -> Dict:
        """
        Main method to process multi-restaurant queries
        """
        # Detect restaurants mentioned in the query
        detected_restaurants = self.detect_restaurants_in_query(query)
        
        # If no restaurants detected in query, check summary
        if not detected_restaurants and summary:
            print(f"🔍 No restaurant in query, checking summary: '{summary[:50]}...'")
            detected_restaurants = self.detect_restaurants_in_query(summary)
            
        # If still no restaurants detected, search all restaurants
        if not detected_restaurants:
            restaurant_ids = [r["id"] for r in self.restaurant_index.get("restaurants", [])]
            print("⚠️  No specific restaurants detected, searching all restaurants")
        else:
            restaurant_ids = [r["id"] for r in detected_restaurants]
        
        # Search comprehensive information
        search_results = self.search_comprehensive_info(query, restaurant_ids)
        
        # Determine if user asked about a specific restaurant explicitly
        # Prioritize explicit mentions over category-based detections
        focus_restaurant = None
        explicit_restaurants = [
            r for r in detected_restaurants 
            if r.get("detection_type") in ["explicit", "explicit_and_category"]
        ]
        
        if explicit_restaurants:
            # User explicitly mentioned a restaurant - focus only on that
            focus_restaurant = explicit_restaurants[0]["name"]
            print(f"🎯 User explicitly asked about {focus_restaurant} - focusing only on this restaurant")
        elif len(detected_restaurants) == 1:
            # Only one restaurant detected (even if by category)
            focus_restaurant = detected_restaurants[0]["name"]
            print(f"🎯 Single restaurant detected: {focus_restaurant}")
        
        # Build context (only focused restaurant if specified)
        context = self.build_comprehensive_context(search_results, focus_restaurant=focus_restaurant)
        
        # Generate suggestions
        suggestions = self._generate_smart_suggestions(query, detected_restaurants, search_results)
        
        return {
            "detected_restaurants": detected_restaurants,
            "search_results": search_results,
            "context": context,
            "suggestions": suggestions,
            "query_type": self._classify_query_type(query)
        }
    
    def _classify_query_type(self, query: str) -> str:
        """Classify the type of query"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["deal", "offer", "combo", "special", "promotion"]):
            return "deals"
        elif any(word in query_lower for word in ["price", "cost", "how much", "expensive", "cheap"]):
            return "pricing"
        elif any(word in query_lower for word in ["location", "where", "branch", "near me", "delivery"]):
            return "location"
        elif any(word in query_lower for word in ["menu", "what do you have", "options", "food"]):
            return "menu"
        elif any(word in query_lower for word in ["time", "hours", "open", "close", "when"]):
            return "timing"
        else:
            return "general"
    
    def _generate_smart_suggestions(self, query: str, detected_restaurants: List[Dict], search_results: Dict) -> List[str]:
        """Generate intelligent follow-up suggestions"""
        suggestions = []
        query_type = self._classify_query_type(query)
        
        if len(detected_restaurants) > 1:
            suggestions.append("Would you like to compare prices between these restaurants?")
            suggestions.append("Which restaurant would you like to know more about?")
        
        if query_type == "deals":
            suggestions.extend([
                "Would you like to see more deals and offers?",
                "Are you interested in family meal deals?",
                "Would you like to know about delivery deals?"
            ])
        elif query_type == "pricing":
            suggestions.extend([
                "Would you like to see the most affordable options?",
                "Are you looking for premium items?",
                "Would you like to compare prices across restaurants?"
            ])
        elif query_type == "location":
            suggestions.extend([
                "Would you like to know about delivery options?",
                "Are you looking for the nearest branch?",
                "Would you like to know about dine-in hours?"
            ])
        else:
            suggestions.extend([
                "Would you like to see more menu options?",
                "Are you interested in any specific cuisine?",
                "Would you like to know about special offers?"
            ])
        
        return suggestions[:3]  # Return top 3 suggestions
    
    def get_available_restaurants(self) -> List[Dict]:
        """Get list of available restaurants"""
        return self.restaurant_index.get("restaurants", [])

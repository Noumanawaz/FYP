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

# Minimum similarity threshold - using adaptive threshold based on results
# We'll use top-K ranking with reranking instead of strict filtering
MIN_SIMILARITY_THRESHOLD = -0.5  # Allow negative similarities, reranker will handle quality

class MultiRestaurantRAGSystem:
    def __init__(self, data_dir: str = "data", vector_db_dir: str = "vector_db", use_vector_db: bool = True):
        self.data_dir = data_dir
        self.vector_db_dir = vector_db_dir
        self.use_vector_db = use_vector_db
        self.restaurant_index = {}
        self.restaurant_data = {}  # Fallback for JSON mode
        
        # Initialize vector DB components
        self.vector_client = None
        self.restaurant_collection = None
        self.index_collection = None
        self.embedding_model = None
        
        # Initialize production-grade components
        self.query_processor = QueryProcessor()
        self.reranker = Reranker()
        self.context_filter = ContextFilter()
        
        # Load restaurant index (needed for restaurant detection)
        self.load_restaurant_index()
        
        # Always load JSON data as fallback/supplement for prices
        self.load_all_restaurants()
        
        # Try to initialize vector DB
        if self.use_vector_db:
            try:
                self._initialize_vector_db()
                print("✅ Vector database initialized")
            except Exception as e:
                print(f"⚠️  Vector DB initialization failed: {e}")
                print("⚠️  Falling back to JSON mode")
                self.use_vector_db = False
        else:
            self.load_all_restaurants()
    
    def _initialize_vector_db(self):
        """Initialize ChromaDB client and collections"""
        if not os.path.exists(self.vector_db_dir):
            raise FileNotFoundError(f"Vector DB directory not found: {self.vector_db_dir}")
        
        self.vector_client = chromadb.PersistentClient(
            path=self.vector_db_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get collections
        try:
            self.restaurant_collection = self.vector_client.get_collection(name="restaurants")
            self.index_collection = self.vector_client.get_collection(name="restaurant_index")
            
            # Initialize embedding model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Check if collections have data
            restaurant_count = self.restaurant_collection.count()
            if restaurant_count == 0:
                raise ValueError("Vector DB collections are empty")
            
            print(f"✅ Loaded vector DB with {restaurant_count} chunks")
        except Exception as e:
            raise Exception(f"Failed to load vector DB: {e}")
    
    def load_restaurant_index(self):
        """Load the restaurant index file (needed for restaurant detection)"""
        try:
            index_path = os.path.join(self.data_dir, "restaurant_index.json")
            with open(index_path, 'r', encoding='utf-8') as f:
                self.restaurant_index = json.load(f)
            print(f"✅ Loaded restaurant index with {len(self.restaurant_index['restaurants'])} restaurants")
        except Exception as e:
            print(f"❌ Error loading restaurant index: {e}")
            self.restaurant_index = {"restaurants": [], "default_restaurant": "cheezious"}
    
    def load_all_restaurants(self):
        """Load all restaurant data files into memory (fallback for JSON mode)"""
        try:
            for restaurant in self.restaurant_index.get("restaurants", []):
                restaurant_id = restaurant["id"]
                file_path = os.path.join(self.data_dir, restaurant["file"])
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        self.restaurant_data[restaurant_id] = json.load(f)
                    print(f"✅ Loaded {restaurant['name']} data from JSON")
                else:
                    print(f"❌ Restaurant file not found: {file_path}")
            
        except Exception as e:
            print(f"❌ Error loading restaurant data: {e}")
    
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
        
        # Semantic search - get more results than needed for reranking
        # Increase search_k to ensure we find chunks with prices when user asks about prices
        query_lower = query.lower()
        if any(kw in query_lower for kw in ['price', 'prices', 'cost', 'how much', 'deal']):
            # For price/deal queries, search more chunks to find ones with prices
            search_k = min(top_k * 3, 20)
        else:
            search_k = min(top_k * 2, 15) if restaurant_ids and len(restaurant_ids) > 1 else min(top_k * 2, 10)
        
        try:
            results = self.restaurant_collection.query(
                query_texts=[processed_query],
                n_results=min(search_k, self.restaurant_collection.count()),
                where=where_clause if where_clause else None
            )
        except Exception as e:
            print(f"❌ Error in vector search: {e}")
            return []
        
        # Process and convert distances to similarities
        retrieved_chunks = []
        if results.get("ids") and len(results["ids"][0]) > 0:
            print(f"📊 Found {len(results['ids'][0])} chunks from semantic search")
            
            for i, doc_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                document = results["documents"][0][i] if results.get("documents") else ""
                distance = results["distances"][0][i] if results.get("distances") else 10.0
                
                # Filter by restaurant_ids if multiple specified
                if restaurant_ids and len(restaurant_ids) > 1:
                    if metadata.get("restaurant_id") not in restaurant_ids:
                        continue
                
                # Convert L2 distance to similarity (ChromaDB uses L2 by default)
                similarity = self._l2_to_similarity(distance)
                
                # Only filter extremely poor matches
                if similarity < MIN_SIMILARITY_THRESHOLD:
                    continue
                
                retrieved_chunks.append({
                    "restaurant_id": metadata.get("restaurant_id", "unknown"),
                    "restaurant_name": metadata.get("restaurant_name", "Unknown"),
                    "content": document,
                    "similarity": similarity,
                    "metadata": metadata
                })
            
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
            
            # Group chunks by restaurant
            restaurant_chunks = {}
            for chunk in retrieved_chunks:
                rid = chunk["restaurant_id"]
                if rid not in restaurant_chunks:
                    restaurant_chunks[rid] = []
                restaurant_chunks[rid].append(chunk)
            
            # Build results structure
            for rid in restaurant_ids:
                chunks = restaurant_chunks.get(rid, [])
                restaurant_name = next(
                    (r["name"] for r in self.restaurant_index.get("restaurants", []) if r["id"] == rid),
                    rid
                )
                
                # Extract information from chunks
                menu_items = []
                deals = []
                general_info = {}
                location_info = {}
                
                for chunk in chunks:
                    content = chunk["content"].lower()
                    metadata = chunk.get("metadata", {})
                    
                    # Try to extract menu items, deals, etc. from content
                    if any(word in content for word in ["price", "rs", "rupee", "cost"]):
                        # Extract price information
                        price_match = re.search(r'rs\.?\s*(\d+)', content, re.IGNORECASE)
                        if price_match:
                            menu_items.append({
                                "name": metadata.get("chunk_index", "Item"),
                                "price": f"Rs. {price_match.group(1)}",
                                "description": chunk["content"][:200],
                                "relevance": chunk["similarity"]
                            })
                    
                    # Check for deals
                    if any(word in content for word in ["deal", "offer", "combo", "special", "promotion"]):
                        deals.append({
                            "name": "Deal from PDF",
                            "description": chunk["content"][:200],
                            "relevance": chunk["similarity"]
                        })
                
                comprehensive_results["results"][rid] = {
                    "name": restaurant_name,
                    "data": {
                        "menu_items": menu_items[:10],  # Top 10
                        "deals": deals[:5],  # Top 5
                        "general_info": general_info,
                        "location_info": location_info,
                        "chunks": chunks  # Include raw chunks for context building
                    }
                }
        else:
            # Fallback to JSON search (original implementation)
            for restaurant_id in restaurant_ids:
                if restaurant_id not in self.restaurant_data:
                    continue
                    
                restaurant_data = self.restaurant_data[restaurant_id]
                restaurant_name = restaurant_data.get("brand", {}).get("name", restaurant_id)
                
                # Search different types of information
                results = {
                    "menu_items": [],
                    "deals": [],
                    "general_info": {},
                    "location_info": {},
                    "pricing_info": []
                }
                
                # Search menu items
                query_lower = query.lower()
                menu = restaurant_data.get("menu", {})
                for section_name, section_items in menu.items():
                    if isinstance(section_items, list):
                        for item in section_items:
                            relevance = self._calculate_relevance(query_lower, item)
                            if relevance > 0:
                                results["menu_items"].append({
                                    "section": section_name,
                                    "item": item,
                                    "relevance": relevance
                                })
                    elif isinstance(section_items, dict):
                        for subsection_name, subsection_items in section_items.items():
                            if isinstance(subsection_items, list):
                                for item in subsection_items:
                                    relevance = self._calculate_relevance(query_lower, item)
                                    if relevance > 0:
                                        results["menu_items"].append({
                                            "section": f"{section_name} - {subsection_name}",
                                            "item": item,
                                            "relevance": relevance
                                        })
                
                # Search deals
                if "deals" in menu:
                    for deal_category, deals in menu["deals"].items():
                        if isinstance(deals, list):
                            for deal in deals:
                                if self._calculate_relevance(query_lower, deal) > 0:
                                    results["deals"].append({
                                        "category": deal_category,
                                        "deal": deal
                                    })
                
                # Extract general information
                brand = restaurant_data.get("brand", {})
                results["general_info"] = {
                    "name": brand.get("name", ""),
                    "description": brand.get("description", ""),
                    "founded": brand.get("founded", ""),
                    "country": brand.get("country", ""),
                    "usp": brand.get("usp", [])
                }
                
                # Extract location information
                branches = restaurant_data.get("branches", {})
                results["location_info"] = {
                    "cities": branches.get("cities", []),
                    "hours": branches.get("hours", ""),
                    "total_branches": branches.get("total_branches", "")
                }
                
                # Sort results by relevance
                results["menu_items"].sort(key=lambda x: x["relevance"], reverse=True)
                
                comprehensive_results["results"][restaurant_id] = {
                    "name": restaurant_name,
                    "data": results
                }
        
        return comprehensive_results
    
    def _calculate_relevance(self, query: str, item: Dict) -> float:
        """Calculate relevance score for a menu item or information (for JSON fallback)"""
        score = 0.0
        
        # Check item name
        item_name = item.get("name", "").lower()
        if query in item_name:
            score += 10.0
        elif any(word in item_name for word in query.split()):
            score += 5.0
        
        # Check description
        description = item.get("description", "").lower()
        if query in description:
            score += 3.0
        elif any(word in description for word in query.split()):
            score += 1.5
        
        # Check for specific query types
        if any(word in query for word in ["deal", "offer", "combo", "special"]):
            if "deal" in item_name or "special" in item_name or "combo" in item_name:
                score += 5.0
        
        if any(word in query for word in ["price", "cost", "rs", "rupee"]):
            if item.get("price"):
                score += 2.0
        
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
                    # Use top 2 most relevant chunks for brief, focused responses
                    selected_chunks = []
                    seen_content_prefixes = set()
                    
                    for chunk in scored_chunks:
                        # Get first 150 chars as signature to avoid near-duplicates
                        content_sig = chunk["content"][:150].lower()
                        if content_sig not in seen_content_prefixes:
                            selected_chunks.append(chunk)
                            seen_content_prefixes.add(content_sig)
                            # Limit to 3 most relevant chunks for complete information
                            if len(selected_chunks) >= 3:
                                break
                    
                    if selected_chunks:
                        print(f"📝 Building context for {restaurant_name}: {len(selected_chunks)} chunks")
                        # Use full chunk content (not filtered) for better context
                        # Clean up the context to help with price extraction
                        relevant_text = "\n\n---\n\n".join([chunk["content"] for chunk in selected_chunks])
                        # Fix common price formatting issues (Rs. , 249 -> Rs. 1,249)
                        # This helps the LLM extract prices better
                        relevant_text = re.sub(r'Rs\.\s*,\s*(\d+)', r'Rs. \1', relevant_text)
                        
                        # Check if prices are missing (only "Rs. ," or "Rs. " without numbers)
                        has_complete_prices = bool(re.search(r'Rs\.\s*\d+', relevant_text, re.IGNORECASE))
                        
                        # If prices are missing, supplement with JSON data
                        if not has_complete_prices and restaurant_id in self.restaurant_data:
                            print(f"  ⚠️  Prices missing in vector DB, supplementing with JSON data...")
                            json_supplement = self._extract_json_prices(restaurant_id, query)
                            if json_supplement:
                                relevant_text += "\n\n---\n\n" + json_supplement
                                print(f"  ✅ Added JSON price data")
                        
                        if relevant_text:
                            context_parts.append(relevant_text)
                            print(f"  ✅ Added {len(relevant_text)} characters of context")
                    else:
                        print(f"  ⚠️  No diverse chunks selected for {restaurant_name}")
                else:
                    print(f"  ⚠️  No chunks found for {restaurant_name}")
            else:
                # JSON mode - use structured data
                # Add general info
                general = data.get("general_info", {})
                if general.get("description"):
                    context_parts.append(f"Description: {general['description']}")
                if general.get("founded"):
                    context_parts.append(f"Founded: {general['founded']}")
                
                # Add location info
                location = data.get("location_info", {})
                if location.get("cities"):
                    context_parts.append(f"Available in: {', '.join(location['cities'][:5])}{'...' if len(location['cities']) > 5 else ''}")
                if location.get("hours"):
                    context_parts.append(f"Hours: {location['hours']}")
                
                # Add relevant menu items
                menu_items = data.get("menu_items", [])
                if menu_items:
                    context_parts.append("Relevant Menu Items:")
                    for item_info in menu_items[:5]:  # Top 5 most relevant
                        item = item_info.get("item", {})
                        context_parts.append(f"• {item.get('name', 'Item')} - {item.get('price', 'Price N/A')}")
                        if item.get('description'):
                            context_parts.append(f"  {item['description']}")
                
                # Add deals
                deals = data.get("deals", [])
                if deals:
                    context_parts.append("Available Deals:")
                    for deal_info in deals[:3]:  # Top 3 deals
                        deal = deal_info.get("deal", {})
                        context_parts.append(f"• {deal.get('name', 'Deal')} - {deal.get('price', 'Price N/A')}")
                        if deal.get('description'):
                            context_parts.append(f"  {deal['description']}")
            
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
                # Try to extract structured information from chunk
                content = chunk["content"]
                metadata = chunk.get("metadata", {})
                
                # Extract price if available
                price_match = re.search(r'rs\.?\s*(\d+)', content, re.IGNORECASE)
                price = f"Rs. {price_match.group(1)}" if price_match else "Price N/A"
                
                # Extract item name (try to find it in content)
                lines = content.split('\n')
                item_name = lines[0][:50] if lines else "Item from PDF"
                
                results.append({
                    "restaurant_id": chunk["restaurant_id"],
                    "restaurant_name": chunk["restaurant_name"],
                    "section": metadata.get("type", "menu"),
                    "item": {
                        "name": item_name,
                        "price": price,
                        "description": content[:200]
                    },
                    "relevance": chunk["similarity"]
                })
        else:
            # JSON fallback
            for rid in target_ids:
                if rid not in self.restaurant_data:
                    continue
                    
                restaurant_data = self.restaurant_data.get(rid, {})
                restaurant_name = restaurant_data.get("brand", {}).get("name", rid)
                menu = restaurant_data.get("menu", {})

                for section_name, section_items in menu.items():
                    if isinstance(section_items, list):
                        for item in section_items:
                            relevance = self._calculate_relevance(query_lower, item)
                            if relevance > 0:
                                results.append({
                                    "restaurant_id": rid,
                                    "restaurant_name": restaurant_name,
                                    "section": section_name,
                                    "item": item,
                                    "relevance": relevance
                                })
                    elif isinstance(section_items, dict):
                        for subsection_name, subsection_items in section_items.items():
                            if isinstance(subsection_items, list):
                                for item in subsection_items:
                                    relevance = self._calculate_relevance(query_lower, item)
                                    if relevance > 0:
                                        results.append({
                                            "restaurant_id": rid,
                                            "restaurant_name": restaurant_name,
                                            "section": f"{section_name} - {subsection_name}",
                                            "item": item,
                                            "relevance": relevance
                                        })

        results.sort(key=lambda x: x["relevance"], reverse=True)
        return results
    
    def process_query(self, query: str) -> Dict:
        """
        Main method to process multi-restaurant queries
        """
        # Detect restaurants mentioned in the query
        detected_restaurants = self.detect_restaurants_in_query(query)
        
        # If no restaurants detected, search all restaurants
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
    
    def _extract_json_prices(self, restaurant_id: str, query: str) -> str:
        """Extract price information from JSON data to supplement vector DB"""
        if restaurant_id not in self.restaurant_data:
            return ""
        
        restaurant_data = self.restaurant_data[restaurant_id]
        menu = restaurant_data.get("menu", {})
        query_lower = query.lower()
        
        # Determine what to extract based on query
        asking_about_deals = any(kw in query_lower for kw in ['deal', 'offer', 'combo', 'special'])
        asking_about_prices = any(kw in query_lower for kw in ['price', 'prices', 'cost', 'how much'])
        
        price_info = []
        
        # Extract deals if asking about deals
        if asking_about_deals and "deals" in menu:
            for deal_type, deals in menu["deals"].items():
                if isinstance(deals, list):
                    for deal in deals:
                        name = deal.get("name", "")
                        price = deal.get("price", "")
                        desc = deal.get("description", "")
                        if price:
                            price_info.append(f"{name}: {price}" + (f" - {desc}" if desc else ""))
        
        # Extract menu items with prices if asking about prices
        if asking_about_prices:
            for section_name, section_items in menu.items():
                if section_name == "deals":
                    continue
                if isinstance(section_items, list):
                    for item in section_items[:5]:  # Limit to top 5
                        name = item.get("name", "")
                        price = item.get("price", "")
                        if price:
                            price_info.append(f"{name}: {price}")
                elif isinstance(section_items, dict):
                    for subsection_name, subsection_items in section_items.items():
                        if isinstance(subsection_items, list):
                            for item in subsection_items[:3]:  # Limit to top 3 per subsection
                                name = item.get("name", "")
                                price = item.get("price", "")
                                if price:
                                    price_info.append(f"{name}: {price}")
        
        if price_info:
            return "Price Information:\n" + "\n".join(price_info)
        return ""
    
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

"""
Advanced Query Processing for Production RAG System

This module provides industry-standard query preprocessing, expansion, and optimization.
"""

import re
from typing import List, Dict, Set
from collections import Counter


class QueryProcessor:
    """Production-grade query processor for RAG systems"""
    
    # Conversational filler words to remove
    FILLER_WORDS = {
        'hi', 'hello', 'hey', 'please', 'thanks', 'thank you',
        'can you', 'could you', 'would you', 'will you',
        'tell me', 'let me know', 'i want', 'i need', 'i would like',
        'show me', 'give me', 'help me', 'i am looking for',
        'do you have', 'is there', 'are there'
    }
    
    # Food-related synonyms for query expansion
    FOOD_SYNONYMS = {
        'deal': ['offer', 'promotion', 'special', 'combo', 'package', 'bundle'],
        'price': ['cost', 'pricing', 'rate', 'amount', 'fee'],
        'menu': ['food', 'items', 'dishes', 'options', 'selection'],
        'pizza': ['pizzas'],
        'burger': ['burgers', 'sandwich'],
        'chicken': ['chickens'],
        'combo': ['deal', 'meal', 'package', 'set'],
        'delivery': ['deliver', 'delivered', 'shipping'],
        'location': ['locations', 'branch', 'branches', 'outlet', 'outlets'],
        'hours': ['timing', 'time', 'schedule', 'opening hours']
    }
    
    def __init__(self):
        self.stop_words = self.FILLER_WORDS
    
    def clean_query(self, query: str) -> str:
        """Remove filler words and normalize query"""
        if not query:
            return ""
        
        # Convert to lowercase
        query_lower = query.lower().strip()
        
        # Remove extra whitespace
        query_lower = re.sub(r'\s+', ' ', query_lower)
        
        # Split into words
        words = query_lower.split()
        
        # Remove filler words
        filtered_words = [w for w in words if w not in self.FILLER_WORDS]
        
        # If we removed too much, keep original but clean it
        if len(filtered_words) < 2:
            # Just remove common fillers but keep structure
            filtered_words = [w for w in words if w not in ['hi', 'hello', 'hey', 'please']]
        
        return ' '.join(filtered_words) if filtered_words else query_lower
    
    def extract_key_terms(self, query: str) -> List[str]:
        """Extract key terms from query for better matching"""
        cleaned = self.clean_query(query)
        
        # Extract restaurant names (common ones)
        restaurant_keywords = ['kfc', 'pizza hut', 'cheezious', 'pizza', 'burger', 'chicken']
        found_restaurants = [r for r in restaurant_keywords if r in cleaned]
        
        # Extract food-related terms
        food_terms = []
        for word in cleaned.split():
            if word in ['deal', 'price', 'menu', 'pizza', 'burger', 'chicken', 'combo', 'delivery']:
                food_terms.append(word)
        
        # Extract numbers (for quantities, prices)
        numbers = re.findall(r'\d+', query)
        
        return {
            'restaurants': found_restaurants,
            'food_terms': food_terms,
            'numbers': numbers,
            'cleaned_query': cleaned
        }
    
    def expand_query(self, query: str) -> List[str]:
        """Generate query variations for better retrieval"""
        cleaned = self.clean_query(query)
        variations = [cleaned]  # Start with cleaned query
        
        # Add synonym expansions
        words = cleaned.split()
        for i, word in enumerate(words):
            if word in self.FOOD_SYNONYMS:
                for synonym in self.FOOD_SYNONYMS[word][:2]:  # Limit to 2 synonyms
                    expanded = words.copy()
                    expanded[i] = synonym
                    variations.append(' '.join(expanded))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variations = []
        for v in variations:
            if v not in seen:
                seen.add(v)
                unique_variations.append(v)
        
        return unique_variations[:5]  # Limit to 5 variations
    
    def extract_entities(self, query: str) -> Dict[str, List[str]]:
        """Extract named entities from query"""
        query_lower = query.lower()
        
        entities = {
            'restaurants': [],
            'food_items': [],
            'quantities': [],
            'price_mentions': []
        }
        
        # Restaurant detection
        restaurant_patterns = {
            'kfc': ['kfc', 'kentucky fried chicken'],
            'pizza_hut': ['pizza hut', 'pizzahut'],
            'cheezious': ['cheezious', 'cheezy']
        }
        
        for restaurant_id, patterns in restaurant_patterns.items():
            for pattern in patterns:
                if pattern in query_lower:
                    entities['restaurants'].append(restaurant_id)
                    break
        
        # Food items (common ones)
        food_items = ['pizza', 'burger', 'chicken', 'biryani', 'karahi', 'tikka', 'naan', 'lassi']
        for item in food_items:
            if item in query_lower:
                entities['food_items'].append(item)
        
        # Quantities
        quantities = re.findall(r'\b(\d+)\s*(piece|pieces|kg|gram|liter|liters|plate|plates)\b', query_lower)
        entities['quantities'] = quantities
        
        # Price mentions
        price_patterns = re.findall(r'\b(price|cost|how much|rupee|rs\.?|pkr)\b', query_lower)
        entities['price_mentions'] = price_patterns
        
        return entities
    
    def create_search_query(self, original_query: str) -> str:
        """Create optimized search query from user input"""
        # Clean the query
        cleaned = self.clean_query(original_query)
        
        # Extract key terms
        key_terms = self.extract_key_terms(original_query)
        
        # Build search query prioritizing key terms
        search_terms = []
        
        # Add restaurant names first (high priority)
        if key_terms['restaurants']:
            search_terms.extend(key_terms['restaurants'])
        
        # Add food terms
        if key_terms['food_terms']:
            search_terms.extend(key_terms['food_terms'])
        
        # Add remaining important words
        remaining_words = [w for w in cleaned.split() 
                          if w not in search_terms and w not in self.FILLER_WORDS]
        search_terms.extend(remaining_words[:5])  # Limit to 5 additional words
        
        return ' '.join(search_terms) if search_terms else cleaned
    
    def normalize_query(self, query: str) -> str:
        """Normalize query for consistent processing"""
        # Remove punctuation except spaces
        normalized = re.sub(r'[^\w\s]', ' ', query)
        
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Lowercase
        normalized = normalized.lower().strip()
        
        return normalized


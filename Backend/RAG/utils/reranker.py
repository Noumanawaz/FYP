"""
Re-ranking Module for Production RAG System

Re-ranks retrieved chunks based on multiple signals for better relevance.
"""

from typing import List, Dict
import re
from collections import Counter


class Reranker:
    """Re-ranks retrieved chunks using multiple relevance signals"""
    
    def __init__(self):
        self.price_keywords = ['price', 'cost', 'rs.', 'rupee', 'pkr', 'how much']
        self.deal_keywords = ['deal', 'offer', 'promotion', 'special', 'combo', 'package']
        self.menu_keywords = ['menu', 'item', 'dish', 'food', 'order']
    
    def calculate_relevance_score(self, chunk: Dict, query: str, query_terms: List[str]) -> float:
        """Calculate comprehensive relevance score for a chunk"""
        content = chunk.get('content', '').lower()
        similarity = chunk.get('similarity', 0.0)
        metadata = chunk.get('metadata', {})
        
        # Base score from semantic similarity (weight: 0.4)
        base_score = similarity * 0.4
        
        # Keyword matching score (weight: 0.3)
        keyword_score = self._calculate_keyword_score(content, query_terms)
        
        # Query type matching (weight: 0.2)
        query_type_score = self._calculate_query_type_score(content, query)
        
        # Metadata boost (weight: 0.1)
        metadata_score = self._calculate_metadata_score(metadata, query_terms)
        
        # Combine scores
        total_score = base_score + (keyword_score * 0.3) + (query_type_score * 0.2) + (metadata_score * 0.1)
        
        return min(1.0, total_score)  # Cap at 1.0
    
    def _calculate_keyword_score(self, content: str, query_terms: List[str]) -> float:
        """Calculate score based on keyword matches"""
        if not query_terms:
            return 0.0
        
        matches = 0
        for term in query_terms:
            if term.lower() in content:
                matches += 1
        
        return min(1.0, matches / len(query_terms)) if query_terms else 0.0
    
    def _calculate_query_type_score(self, content: str, query: str) -> float:
        """Calculate score based on query type (price, deal, menu, etc.)"""
        query_lower = query.lower()
        score = 0.0
        
        # Price queries - heavily boost chunks with actual prices
        if any(kw in query_lower for kw in self.price_keywords):
            # Check for actual price numbers (Rs. 123, Rs 123, etc.)
            price_matches = re.findall(r'rs\.?\s*\d+', content, re.IGNORECASE)
            if price_matches:
                score += 1.0  # Strong boost for chunks with actual prices
            elif any(kw in content for kw in ['rs.', 'rupee', 'price', 'cost']):
                score += 0.3  # Smaller boost for price-related keywords
        
        # Deal queries - boost chunks with deals AND prices
        if any(kw in query_lower for kw in self.deal_keywords):
            has_deal_keywords = any(kw in content for kw in self.deal_keywords)
            has_combo = 'combo' in content or 'package' in content
            has_prices = bool(re.search(r'rs\.?\s*\d+', content, re.IGNORECASE))
            
            if has_deal_keywords or has_combo:
                score += 0.5
            # Extra boost if deal chunk also has prices
            if has_prices and (has_deal_keywords or has_combo):
                score += 0.5
        
        # Menu queries
        if any(kw in query_lower for kw in self.menu_keywords):
            if any(kw in content for kw in ['name', 'description', 'item']):
                score += 0.5
        
        return min(1.0, score)
    
    def _calculate_metadata_score(self, metadata: Dict, query_terms: List[str]) -> float:
        """Calculate score based on metadata"""
        score = 0.0
        
        # Restaurant name match
        restaurant_name = metadata.get('restaurant_name', '').lower()
        for term in query_terms:
            if term in restaurant_name or restaurant_name in term:
                score += 0.5
                break
        
        # Type match
        chunk_type = metadata.get('type', '').lower()
        if 'menu' in chunk_type and any('menu' in t for t in query_terms):
            score += 0.3
        if 'deal' in chunk_type and any('deal' in t for t in query_terms):
            score += 0.3
        
        return min(1.0, score)
    
    def rerank(self, chunks: List[Dict], query: str, query_terms: List[str]) -> List[Dict]:
        """Re-rank chunks based on multiple signals"""
        if not chunks:
            return []
        
        # Calculate relevance scores
        scored_chunks = []
        for chunk in chunks:
            relevance = self.calculate_relevance_score(chunk, query, query_terms)
            chunk_copy = chunk.copy()
            chunk_copy['rerank_score'] = relevance
            scored_chunks.append(chunk_copy)
        
        # Sort by rerank score (descending)
        scored_chunks.sort(key=lambda x: x['rerank_score'], reverse=True)
        
        return scored_chunks


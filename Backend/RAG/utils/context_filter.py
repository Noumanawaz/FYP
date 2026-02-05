"""
Intelligent Context Filtering for Phone-Call Style Responses

Filters and extracts only the specific information needed to answer the query.
"""

import re
from typing import List, Dict, Optional


class ContextFilter:
    """Filters context to only include information directly relevant to the query"""
    
    def __init__(self):
        self.price_keywords = ['price', 'cost', 'how much', 'rs.', 'rupee', 'pkr']
        self.deal_keywords = ['deal', 'offer', 'combo', 'special', 'promotion', 'package']
        self.menu_keywords = ['menu', 'item', 'option', 'food', 'dish', 'what do you have']
        self.location_keywords = ['location', 'where', 'branch', 'outlet', 'city']
        self.hours_keywords = ['hours', 'time', 'open', 'close', 'when']
    
    def extract_relevant_sections(self, chunk_content: str, query: str) -> str:
        """Extract only the sections of a chunk that are relevant to the query"""
        query_lower = query.lower()
        lines = chunk_content.split('\n')
        relevant_lines = []
        
        # Determine what the user is asking about
        asking_about_prices = any(kw in query_lower for kw in self.price_keywords)
        asking_about_deals = any(kw in query_lower for kw in self.deal_keywords)
        asking_about_menu = any(kw in query_lower for kw in self.menu_keywords)
        asking_about_location = any(kw in query_lower for kw in self.location_keywords)
        asking_about_hours = any(kw in query_lower for kw in self.hours_keywords)
        
        # If asking about specific things, filter lines
        for line in lines:
            line_lower = line.lower()
            
            # If asking about prices, include lines with prices
            if asking_about_prices:
                if any(kw in line_lower for kw in ['rs.', 'rupee', 'price', 'cost']) or re.search(r'rs\.?\s*\d+', line, re.IGNORECASE):
                    relevant_lines.append(line)
                    continue
            
            # If asking about deals, include deal-related lines
            if asking_about_deals:
                if any(kw in line_lower for kw in self.deal_keywords):
                    relevant_lines.append(line)
                    continue
            
            # If asking about menu, include menu items
            if asking_about_menu:
                if any(kw in line_lower for kw in ['pizza', 'burger', 'chicken', 'item', 'menu']):
                    relevant_lines.append(line)
                    continue
            
            # If asking about location, include location info
            if asking_about_location:
                if any(kw in line_lower for kw in ['location', 'city', 'branch', 'address']):
                    relevant_lines.append(line)
                    continue
            
            # If asking about hours, include hours info
            if asking_about_hours:
                if any(kw in line_lower for kw in ['hours', 'time', 'open', 'close', 'am', 'pm']):
                    relevant_lines.append(line)
                    continue
        
        # If we filtered and got results, return filtered
        if relevant_lines:
            return '\n'.join(relevant_lines)
        
        # Otherwise return first 500 chars (most relevant part)
        return chunk_content[:500]
    
    def filter_chunks_by_query(self, chunks: List[Dict], query: str) -> List[Dict]:
        """Filter chunks to only include those relevant to the query"""
        query_lower = query.lower()
        filtered_chunks = []
        
        for chunk in chunks:
            content = chunk.get('content', '').lower()
            
            # Check if chunk is relevant to query
            is_relevant = False
            
            # Check for direct keyword matches
            query_words = set(query_lower.split())
            content_words = set(content.split())
            common_words = query_words.intersection(content_words)
            
            # If significant overlap, it's relevant
            if len(common_words) >= 2:
                is_relevant = True
            
            # Check for specific query types
            if any(kw in query_lower for kw in self.price_keywords):
                if any(kw in content for kw in ['rs.', 'rupee', 'price']):
                    is_relevant = True
            
            if any(kw in query_lower for kw in self.deal_keywords):
                if any(kw in content for kw in self.deal_keywords):
                    is_relevant = True
            
            if is_relevant:
                # Extract only relevant sections
                filtered_content = self.extract_relevant_sections(chunk['content'], query)
                chunk_copy = chunk.copy()
                chunk_copy['content'] = filtered_content
                filtered_chunks.append(chunk_copy)
        
        return filtered_chunks if filtered_chunks else chunks[:1]  # Return at least one chunk


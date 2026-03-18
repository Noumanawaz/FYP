"""
Vector Database Builder for Restaurant RAG System

This script extracts text from PDF files, creates embeddings, and stores them
in a ChromaDB vector database. Run this script whenever PDF files are updated.

Usage:
    python build_vector_db.py
"""

import os
import json
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Optional
import pdfplumber
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

load_dotenv()

class VectorDBBuilder:
    def __init__(self, data_dir: str = "data", vector_db_dir: str = "vector_db"):
        self.data_dir = data_dir
        self.vector_db_dir = vector_db_dir
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=vector_db_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Create or get collections with explicit distance function
        # Using cosine similarity for better semantic matching
        self.restaurant_collection = self.client.get_or_create_collection(
            name="restaurants",
            metadata={"description": "Restaurant menu and information"},
            embedding_function=None  # We'll provide embeddings manually
        )
        self.index_collection = self.client.get_or_create_collection(
            name="restaurant_index",
            metadata={"description": "Restaurant index and metadata"}
        )
        
        print(f"✅ Initialized ChromaDB at {vector_db_dir}")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF file with improved price extraction"""
        text_content = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Try extracting tables first (better for structured data like menus with prices)
                    tables = page.extract_tables()
                    page_text = ""
                    
                    # Extract tables if available
                    if tables:
                        for table in tables:
                            for row in table:
                                if row:
                                    # Join row cells with proper spacing
                                    row_text = " | ".join([str(cell) if cell else "" for cell in row])
                                    if row_text.strip():
                                        page_text += row_text + "\n"
                    
                    # Also extract regular text (fallback and for non-table content)
                    regular_text = page.extract_text()
                    if regular_text:
                        # Combine table and regular text
                        if page_text:
                            page_text += "\n" + regular_text
                        else:
                            page_text = regular_text
                    
                    # Try to extract text using layout preservation (better for prices)
                    if not page_text or len(page_text) < 100:
                        # Try extracting with layout=True for better structure
                        layout_text = page.extract_text(layout=True)
                        if layout_text and len(layout_text) > len(page_text):
                            page_text = layout_text
                    
                    # Clean up common PDF extraction artifacts
                    if page_text:
                        # 1. Remove (cid:n) patterns (common PDF encoding error)
                        page_text = re.sub(r'\(cid:\d+\)', '', page_text)
                        
                        # 2. Fix "s p a c e d" out text (e.g., "M e n u" -> "Menu")
                        # If a string has spaces between every character, collapse it
                        def fix_spaced_text(match):
                            text = match.group(0)
                            if len(text) > 4 and " " in text:
                                # Check if it's mostly single characters separated by spaces
                                parts = text.split()
                                if all(len(p) == 1 for p in parts if p):
                                    return "".join(parts)
                            return text
                        
                        page_text = re.sub(r'([A-Za-z]\s){3,}[A-Za-z]', fix_spaced_text, page_text)

                        # 3. Clean up null bytes and special characters
                        page_text = re.sub(r'\x00+', ' ', page_text)
                        
                        # 4. Normalize spacing (but keep newlines for section separation)
                        page_text = re.sub(r'[ \t]+', ' ', page_text)
                        
                        text_content.append(f"Page {page_num}:\n{page_text}\n")
            
            full_text = "\n".join(text_content)
            print(f"✅ Extracted {len(full_text)} characters from {os.path.basename(pdf_path)}")
            return full_text
        
        except Exception as e:
            print(f"❌ Error extracting text from {pdf_path}: {e}")
            return ""

    def extract_text_from_txt(self, txt_path: str) -> str:
        """Simply read a plain text file"""
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                text = f.read()
            print(f"✅ Extracted {len(text)} characters from {os.path.basename(txt_path)}")
            return text
        except Exception as e:
            print(f"❌ Error reading text file {txt_path}: {e}")
            return ""
    
    def chunk_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 100) -> List[str]:
        """
        Production-grade text chunking with sentence-aware boundaries
        Optimized for RAG retrieval with proper overlap and size management
        """
        if not text:
            return []
        
        chunks = []
        # Increased chunk size for better menu item grouping
        target_chunk_size = 1000  # Up from 600
        overlap_size = 200        # Up from 150
        
        # Split by sentences first for better chunk boundaries
        # Handle multiple sentence endings
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        # If sentence splitting didn't work well, split by newlines
        if len(sentences) < 2:
            sentences = text.split('\n')
        
        current_chunk = ""
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Check if adding this sentence would exceed target size
            potential_chunk = current_chunk + " " + sentence if current_chunk else sentence
            
            if len(potential_chunk) > target_chunk_size and current_chunk:
                # Save current chunk
                chunks.append(current_chunk.strip())
                
                # Create overlap: take last N characters from current chunk
                if len(current_chunk) > overlap_size:
                    overlap_text = current_chunk[-overlap_size:].strip()
                    # Try to start overlap at a word boundary
                    first_space = overlap_text.find(' ')
                    if first_space > 0:
                        overlap_text = overlap_text[first_space:].strip()
                    current_chunk = overlap_text + " " + sentence if overlap_text else sentence
                else:
                    current_chunk = sentence
            else:
                current_chunk = potential_chunk
        
        # Add the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Fallback to word-based chunking if sentence splitting failed
        if len(chunks) == 0:
            words = text.split()
            word_chunk_size = 150  # words
            word_overlap = 30  # words
            
            for i in range(0, len(words), word_chunk_size - word_overlap):
                chunk = " ".join(words[i:i + word_chunk_size])
                if chunk.strip():
                    chunks.append(chunk)
        
        # Filter out very small chunks (likely noise)
        chunks = [chunk for chunk in chunks if len(chunk.strip()) >= 50]
        
        return chunks
    
    def get_pdf_hash(self, pdf_path: str) -> str:
        """Calculate hash of PDF file to detect changes"""
        try:
            with open(pdf_path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()
            return file_hash
        except Exception as e:
            print(f"❌ Error calculating hash for {pdf_path}: {e}")
            return ""
    
    def load_restaurant_index(self) -> Dict:
        """Load restaurant index JSON to map PDFs to restaurant IDs"""
        index_path = os.path.join(self.data_dir, "restaurant_index.json")
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading restaurant index: {e}")
            return {"restaurants": []}
    
    def map_pdf_to_restaurant(self, pdf_filename: str, restaurant_index: Dict) -> Optional[Dict]:
        """Map PDF filename to restaurant information"""
        pdf_lower = pdf_filename.lower()
        
        for restaurant in restaurant_index.get("restaurants", []):
            restaurant_name = restaurant.get("name", "").lower()
            restaurant_id = restaurant.get("id", "")
            
            # Check if PDF name matches restaurant
            if restaurant_name in pdf_lower or restaurant_id in pdf_lower:
                return restaurant
        
        # Special case for restaurant index PDF
        if "index" in pdf_lower or "restaurant" in pdf_lower:
            return {"id": "index", "name": "Restaurant Index", "type": "index"}
        
        return None
    
    def build_vector_db(self, force_rebuild: bool = False):
        """Build vector database from all PDF files"""
        print("\n🚀 Starting Vector Database Build Process...\n")
        
        # Load restaurant index
        restaurant_index = self.load_restaurant_index()
        
        # Find all PDF and TXT files
        files = list(Path(self.data_dir).glob("*.pdf")) + list(Path(self.data_dir).glob("*.txt"))
        
        if not files:
            print("❌ No PDF or TXT files found in data directory")
            return
        
        print(f"📄 Found {len(files)} file(s) for ingestion\n")
        
        # Track processed files
        processed_count = 0
        total_chunks = 0
        
        for file_path in files:
            filename = file_path.name
            print(f"📖 Processing: {filename}")
            
            # Map file to restaurant
            restaurant_info = self.map_pdf_to_restaurant(filename, restaurant_index)
            
            if not restaurant_info:
                # If name match fails, try splitting the filename (e.g., "Cheezious_exported_dataset.txt")
                base_name = filename.split('_')[0].split('.')[0].lower()
                for rest in restaurant_index.get("restaurants", []):
                    if rest['name'].lower() in base_name or base_name in rest['name'].lower():
                        restaurant_info = rest
                        break
                
                if not restaurant_info:
                    print(f"⚠️  Could not map {filename} to a restaurant, skipping...")
                    continue
            
            restaurant_id = restaurant_info.get("id", "unknown")
            restaurant_name = restaurant_info.get("name", "Unknown")
            
            # Check if we need to rebuild (by checking hash)
            file_hash = self.get_pdf_hash(str(file_path))
            
            # Query existing documents for this restaurant
            try:
                existing_docs = self.restaurant_collection.get(
                    where={"restaurant_id": restaurant_id}
                )
                
                # Check if file has changed
                needs_update = force_rebuild
                if existing_docs.get("ids") and len(existing_docs["ids"]) > 0:
                    # Check if hash matches
                    existing_hashes = []
                    if existing_docs.get("metadatas"):
                        existing_hashes = [doc.get("hash", "") for doc in existing_docs["metadatas"]]
                    
                    if file_hash not in existing_hashes:
                        needs_update = True
                        print(f"🔄 File has changed, updating vector DB...")
                        # Delete old documents in ChromaDB
                        self.restaurant_collection.delete(where={"restaurant_id": restaurant_id})
                else:
                    needs_update = True
            except Exception as e:
                print(f"⚠️  Error checking existing documents: {e}")
                needs_update = True
            
            # Forcing rebuild for improved extraction
            if not needs_update and not force_rebuild:
                print(f"🔄 Forcing rebuild for {restaurant_name} to use improved extraction...")
                try:
                    self.restaurant_collection.delete(where={"restaurant_id": restaurant_id})
                    needs_update = True
                except Exception as e:
                    print(f"⚠️  Error deleting old docs: {e}")
                    needs_update = True
            
            if not needs_update:
                print(f"✅ {restaurant_name} already up to date, skipping...\n")
                continue
            
            # Extract text
            if filename.lower().endswith(".pdf"):
                text = self.extract_text_from_pdf(str(file_path))
            else:
                text = self.extract_text_from_txt(str(file_path))
            
            if not text:
                print(f"⚠️  No text extracted from {filename}, skipping...\n")
                continue
            
            # Chunk the text
            chunks = self.chunk_text(text)
            print(f"📝 Created {len(chunks)} text chunks")
            
            if not chunks:
                print(f"⚠️  No chunks created from {filename}, skipping...\n")
                continue
            
            # Create embeddings
            print(f"🧮 Generating embeddings...")
            embeddings = self.embedding_model.encode(chunks, show_progress_bar=True)
            
            # ── Store in NeonDB (pgvector) ──────────────────────────────────────
            import services.neon_vector_store as neon_store
            try:
                neon_count = neon_store.upsert_chunks(
                    restaurant_id=restaurant_id,
                    restaurant_name=restaurant_name,
                    chunks=chunks,
                    embeddings=embeddings,
                    pdf_filename=filename
                )
                print(f"✅ Synced {neon_count} chunks to NeonDB (Cloud)")
            except Exception as e:
                print(f"⚠️  Failed to sync to NeonDB: {e}")

            # Prepare documents for ChromaDB (Local Backup)
            ids = []
            documents = []
            metadatas = []
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_id = f"{restaurant_id}_chunk_{i}"
                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append({
                    "restaurant_id": restaurant_id,
                    "restaurant_name": restaurant_name,
                    "pdf_filename": filename,
                    "chunk_index": i,
                    "hash": file_hash,
                    "type": restaurant_info.get("type", "menu")
                })
            
            # Store in ChromaDB
            self.restaurant_collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings.tolist(),
                metadatas=metadatas
            )
            
            total_chunks += len(chunks)
            processed_count += 1
            print(f"✅ Stored {len(chunks)} chunks for {restaurant_name}\n")
        
        # Store restaurant index metadata
        self._store_restaurant_index_metadata(restaurant_index)
        
        print(f"\n🎉 Vector Database Build Complete!")
        print(f"   - Processed {processed_count} PDF file(s)")
        print(f"   - Created {total_chunks} total chunks")
        print(f"   - Vector DB location: {self.vector_db_dir}\n")
    
    def _store_restaurant_index_metadata(self, restaurant_index: Dict):
        """Store restaurant index metadata in vector DB"""
        try:
            # Convert restaurant index to text for embedding
            index_text = json.dumps(restaurant_index, indent=2)
            
            # Create embedding
            embedding = self.embedding_model.encode([index_text])[0]
            
            # Store in index collection
            self.index_collection.upsert(
                ids=["restaurant_index"],
                documents=[index_text],
                embeddings=[embedding.tolist()],
                metadatas=[{"type": "restaurant_index", "version": "1.0"}]
            )
            
            print("✅ Stored restaurant index metadata")
        except Exception as e:
            print(f"⚠️  Error storing restaurant index metadata: {e}")
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the vector database"""
        try:
            restaurant_count = self.restaurant_collection.count()
            index_count = self.index_collection.count()
            
            return {
                "restaurant_chunks": restaurant_count,
                "index_documents": index_count,
                "total_documents": restaurant_count + index_count
            }
        except Exception as e:
            print(f"❌ Error getting collection stats: {e}")
            return {}


def main():
    """Main function to build vector database"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Build vector database from PDF files")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rebuild even if PDFs haven't changed"
    )
    parser.add_argument(
        "--data-dir",
        default="data",
        help="Directory containing PDF files (default: data)"
    )
    parser.add_argument(
        "--vector-db-dir",
        default="vector_db",
        help="Directory for vector database storage (default: vector_db)"
    )
    
    args = parser.parse_args()
    
    # Create builder
    builder = VectorDBBuilder(
        data_dir=args.data_dir,
        vector_db_dir=args.vector_db_dir
    )
    
    # Build vector database
    builder.build_vector_db(force_rebuild=args.force)
    
    # Print statistics
    stats = builder.get_collection_stats()
    print("\n📊 Vector Database Statistics:")
    for key, value in stats.items():
        print(f"   - {key}: {value}")


if __name__ == "__main__":
    main()


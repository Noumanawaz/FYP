# Vector Database Setup Guide

This guide explains how to set up and use the vector database system for the RAG (Retrieval Augmented Generation) voice assistant.

## Overview

The system has been upgraded to use vector databases instead of JSON files for better semantic search and retrieval. The vector database stores embeddings of PDF content, allowing the bot to answer questions based on the actual PDF content rather than pre-structured JSON data.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Build Vector Database from PDFs

Run the build script to extract text from PDFs and create embeddings:

```bash
python build_vector_db.py
```

This will:
- Extract text from all PDF files in the `data/` directory
- Create embeddings using sentence transformers
- Store them in ChromaDB (persistent vector database)
- Save the database in the `vector_db/` directory

### 3. Run the Application

```bash
python main.py
```

The application will automatically detect and use the vector database if it exists. If the vector database is not found, it will fall back to JSON mode.

## Updating the Vector Database

Whenever you update or add PDF files:

1. Place the new/updated PDF files in the `data/` directory
2. Run the build script again:

```bash
python build_vector_db.py
```

The script automatically detects changes in PDF files and only updates what's necessary. To force a complete rebuild:

```bash
python build_vector_db.py --force
```

## How It Works

### Vector Database Structure

- **restaurants collection**: Stores chunks of text from restaurant menu PDFs
- **restaurant_index collection**: Stores restaurant index metadata

### PDF to Restaurant Mapping

The script automatically maps PDF files to restaurants based on:
- Filename matching (e.g., `Cheezious.pdf` → `cheezious` restaurant)
- Restaurant index JSON file for metadata

### Semantic Search

When a user asks a question:
1. The query is converted to an embedding
2. Similar chunks are retrieved from the vector database
3. The most relevant information is used to generate a response

## File Structure

```
Backend/RAG/
├── data/
│   ├── Cheezious.pdf
│   ├── KFC.pdf
│   ├── Pizza Hut.pdf
│   ├── Restaurant Index.pdf
│   └── restaurant_index.json (still needed for restaurant detection)
├── vector_db/          # Created automatically
│   └── (ChromaDB files)
├── build_vector_db.py  # Script to build/update vector DB
├── main.py             # FastAPI application
└── utils/
    └── rag_system.py   # Updated to use vector DB
```

## Command Line Options

### build_vector_db.py

```bash
python build_vector_db.py [OPTIONS]

Options:
  --force              Force rebuild even if PDFs haven't changed
  --data-dir DIR       Directory containing PDF files (default: data)
  --vector-db-dir DIR  Directory for vector database (default: vector_db)
```

## Troubleshooting

### Vector DB Not Found

If you see "Vector DB directory not found", run:
```bash
python build_vector_db.py
```

### PDFs Not Being Processed

- Check that PDF files are in the `data/` directory
- Verify PDF filenames match restaurant names (case-insensitive)
- Check the console output for error messages

### Fallback to JSON Mode

If the vector database fails to initialize, the system automatically falls back to JSON mode. Check:
- Vector DB directory exists and has data
- ChromaDB is properly installed
- No permission issues with the vector_db directory

## Benefits of Vector Database

1. **Semantic Understanding**: Better understanding of user queries
2. **PDF-Based**: Directly uses PDF content, no need to maintain JSON files
3. **Automatic Updates**: Easy to update when PDFs change
4. **Better Retrieval**: Finds relevant information even with different wording
5. **Scalable**: Can handle large amounts of text efficiently

## Notes

- The `restaurant_index.json` file is still needed for restaurant detection logic
- The system maintains backward compatibility with JSON mode
- Vector database is persistent - you don't need to rebuild unless PDFs change


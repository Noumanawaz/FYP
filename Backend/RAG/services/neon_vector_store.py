"""
NeonDB pgvector store for restaurant embeddings.

Schema (created on first use):
  restaurant_embeddings(
      id             SERIAL PRIMARY KEY,
      restaurant_id  TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      chunk_index    INTEGER,
      content        TEXT NOT NULL,
      embedding      vector(384),       -- all-MiniLM-L6-v2 output dim
      pdf_filename   TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW()
  )
"""

import os
import psycopg2
import psycopg2.extras
import numpy as np
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

_EMBEDDING_DIM = 384   # all-MiniLM-L6-v2

# ─── connection ──────────────────────────────────────────────────────────────

def _get_conn():
    """Open a fresh psycopg2 connection to NeonDB."""
    url = os.getenv("NEON_DATABASE_URL")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL is not set in RAG .env")
    return psycopg2.connect(url)


# ─── one-time setup ──────────────────────────────────────────────────────────

def setup_table() -> bool:
    """
    Enable pgvector extension and create the embeddings table if it doesn't
    exist.  Returns True on success, False on failure.
    """
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                # Enable pgvector (idempotent)
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS restaurant_embeddings (
                        id              SERIAL PRIMARY KEY,
                        restaurant_id   TEXT NOT NULL,
                        restaurant_name TEXT NOT NULL,
                        chunk_index     INTEGER,
                        content         TEXT NOT NULL,
                        embedding       vector({_EMBEDDING_DIM}),
                        pdf_filename    TEXT,
                        created_at      TIMESTAMPTZ DEFAULT NOW()
                    );
                """)

                # Index for fast cosine-similarity search
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_restaurant_embeddings_vec
                    ON restaurant_embeddings
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 50);
                """)

                # Index for restaurant-id lookups / deletions
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_restaurant_embeddings_rid
                    ON restaurant_embeddings (restaurant_id);
                """)

        conn.close()
        print("✅ NeonDB pgvector table ready (restaurant_embeddings)")
        return True
    except Exception as e:
        print(f"❌ NeonDB setup failed: {e}")
        return False


# ─── write ───────────────────────────────────────────────────────────────────

def upsert_chunks(
    restaurant_id: str,
    restaurant_name: str,
    chunks: List[str],
    embeddings: np.ndarray,
    pdf_filename: str = "",
) -> int:
    """
    Delete all existing chunks for this restaurant_id, then insert new ones.
    Returns the number of chunks inserted.
    """
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must have the same length")

    conn = _get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                # Idempotent: replace all chunks for this restaurant
                cur.execute(
                    "DELETE FROM restaurant_embeddings WHERE restaurant_id = %s",
                    (restaurant_id,),
                )

                rows = [
                    (
                        restaurant_id,
                        restaurant_name,
                        i,
                        chunk,
                        embeddings[i].tolist(),   # list[float] → pgvector
                        pdf_filename,
                    )
                    for i, chunk in enumerate(chunks)
                ]

                psycopg2.extras.execute_values(
                    cur,
                    """
                    INSERT INTO restaurant_embeddings
                        (restaurant_id, restaurant_name, chunk_index,
                         content, embedding, pdf_filename)
                    VALUES %s
                    """,
                    rows,
                    template="(%s, %s, %s, %s, %s::vector, %s)",
                    page_size=100,
                )

        return len(chunks)
    finally:
        conn.close()


# ─── read / search ────────────────────────────────────────────────────────────

def search_similar(
    query_embedding: np.ndarray,
    top_k: int = 5,
    restaurant_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Return the top_k most similar chunks using cosine distance.
    Optionally filter by restaurant_id.
    """
    vec = query_embedding.tolist()

    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if restaurant_id:
                cur.execute(
                    """
                    SELECT
                        restaurant_id,
                        restaurant_name,
                        chunk_index,
                        content,
                        pdf_filename,
                        1 - (embedding <=> %s::vector) AS similarity
                    FROM restaurant_embeddings
                    WHERE restaurant_id = %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (vec, restaurant_id, vec, top_k),
                )
            else:
                cur.execute(
                    """
                    SELECT
                        restaurant_id,
                        restaurant_name,
                        chunk_index,
                        content,
                        pdf_filename,
                        1 - (embedding <=> %s::vector) AS similarity
                    FROM restaurant_embeddings
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (vec, vec, top_k),
                )
            rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_all_restaurant_ids() -> List[str]:
    """Return distinct restaurant IDs that have embeddings in NeonDB."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT restaurant_id FROM restaurant_embeddings"
            )
            return [row[0] for row in cur.fetchall()]
    finally:
        conn.close()

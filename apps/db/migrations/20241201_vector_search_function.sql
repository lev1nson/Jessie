-- Function for semantic search using pgvector cosine similarity
CREATE OR REPLACE FUNCTION match_emails(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  subject text,
  body_text text,
  sent_at timestamptz,
  metadata jsonb,
  text_chunks jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.subject,
    e.body_text,
    e.sent_at,
    e.metadata,
    e.text_chunks,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM emails e
  WHERE 
    e.embedding IS NOT NULL
    AND e.is_filtered = false
    AND (user_id_filter IS NULL OR e.user_id = user_id_filter)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS emails_embedding_hnsw_idx 
ON emails USING hnsw (embedding vector_cosine_ops);

-- Create index for user filtering
CREATE INDEX IF NOT EXISTS emails_user_vectorized_idx 
ON emails (user_id, vectorized_at) WHERE is_filtered = false;

-- Create index for vectorization status
CREATE INDEX IF NOT EXISTS emails_vectorization_pending_idx 
ON emails (user_id, is_filtered) WHERE vectorized_at IS NULL;
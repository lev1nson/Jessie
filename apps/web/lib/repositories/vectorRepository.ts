import { createServiceSupabase } from '@jessie/lib';
import { SupabaseClient } from '@supabase/supabase-js';

export interface VectorData {
  id: string;
  embedding: number[];
  text_chunks: any;
  metadata?: any;
}

export interface VectorSearchResult {
  id: string;
  similarity: number;
  metadata?: any;
  text_chunks?: any;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  userId?: string;
}

/**
 * Repository for vector operations with Supabase pgvector
 */
export class VectorRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceSupabase();
  }

  /**
   * Save email embedding to database
   */
  async saveEmailEmbedding(
    emailId: string,
    embedding: number[],
    textChunks: any,
    metadata?: any
  ): Promise<void> {
    const { error } = await this.client
      .from('emails')
      .update({
        embedding,
        text_chunks: textChunks,
        metadata: metadata ? { ...metadata } : undefined,
        vectorized_at: new Date().toISOString(),
      })
      .eq('id', emailId);

    if (error) {
      throw new Error(`Failed to save email embedding: ${error.message}`);
    }
  }

  /**
   * Batch save multiple email embeddings
   */
  async batchSaveEmbeddings(vectors: VectorData[]): Promise<void> {
    if (vectors.length === 0) return;

    const updates = vectors.map(vector => ({
      id: vector.id,
      embedding: vector.embedding,
      text_chunks: vector.text_chunks,
      metadata: vector.metadata,
      vectorized_at: new Date().toISOString(),
    }));

    const { error } = await this.client
      .from('emails')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to batch save embeddings: ${error.message}`);
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   */
  async searchSimilarVectors(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, threshold = 0.7, userId } = options;

    let query = this.client
      .rpc('match_emails', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
      });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search similar vectors: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get emails that need vectorization
   */
  async getEmailsForVectorization(
    userId: string,
    limit: number = 100
  ): Promise<Array<{ id: string; body_text: string; subject: string }>> {
    const { data, error } = await this.client
      .from('emails')
      .select('id, body_text, subject')
      .eq('user_id', userId)
      .is('vectorized_at', null)
      .is('is_filtered', false)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get emails for vectorization: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if email is already vectorized
   */
  async isEmailVectorized(emailId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('emails')
      .select('vectorized_at')
      .eq('id', emailId)
      .single();

    if (error) {
      throw new Error(`Failed to check vectorization status: ${error.message}`);
    }

    return data?.vectorized_at !== null;
  }

  /**
   * Get vectorization statistics for user
   */
  async getVectorizationStats(userId: string): Promise<{
    total: number;
    vectorized: number;
    pending: number;
  }> {
    const { data: totalData, error: totalError } = await this.client
      .from('emails')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_filtered', false);

    if (totalError) {
      throw new Error(`Failed to get total emails count: ${totalError.message}`);
    }

    const { data: vectorizedData, error: vectorizedError } = await this.client
      .from('emails')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_filtered', false)
      .not('vectorized_at', 'is', null);

    if (vectorizedError) {
      throw new Error(`Failed to get vectorized emails count: ${vectorizedError.message}`);
    }

    const total = totalData?.length || 0;
    const vectorized = vectorizedData?.length || 0;
    const pending = total - vectorized;

    return { total, vectorized, pending };
  }

  /**
   * Delete email embedding
   */
  async deleteEmailEmbedding(emailId: string): Promise<void> {
    const { error } = await this.client
      .from('emails')
      .update({
        embedding: null,
        text_chunks: null,
        vectorized_at: null,
      })
      .eq('id', emailId);

    if (error) {
      throw new Error(`Failed to delete email embedding: ${error.message}`);
    }
  }
}

export default VectorRepository;
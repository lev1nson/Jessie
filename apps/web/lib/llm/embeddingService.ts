import OpenAI from 'openai';
import OpenAIClient from './openaiClient';

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  totalTokens: number;
}

/**
 * Service for generating text embeddings using OpenAI API
 */
export class EmbeddingService {
  private client: OpenAI;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly maxBatchSize = 100;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor() {
    this.client = OpenAIClient.getInstance().getClient();
  }

  /**
   * Generate embedding for a single text
   */
  public async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const { text, model = this.defaultModel } = request;

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.embeddings.create({
          model,
          input: text,
        });
      });

      return {
        embedding: response.data[0].embedding,
        tokens: response.usage.total_tokens,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  public async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const { texts, model = this.defaultModel } = request;

    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    if (texts.length > this.maxBatchSize) {
      throw new Error(`Batch size cannot exceed ${this.maxBatchSize}`);
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid texts provided');
    }

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.embeddings.create({
          model,
          input: validTexts,
        });
      });

      return {
        embeddings: response.data.map((item: { embedding: number[] }) => item.embedding),
        totalTokens: response.usage.total_tokens,
      };
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process large text arrays by splitting into batches
   */
  public async processLargeTextArray(texts: string[], model?: string): Promise<BatchEmbeddingResponse> {
    if (texts.length <= this.maxBatchSize) {
      return this.generateBatchEmbeddings({ texts, model });
    }

    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      batches.push(texts.slice(i, i + this.maxBatchSize));
    }

    const results: BatchEmbeddingResponse[] = [];
    
    for (const batch of batches) {
      const result = await this.generateBatchEmbeddings({ texts: batch, model });
      results.push(result);
      
      // Add small delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(500);
      }
    }

    return {
      embeddings: results.flatMap(result => result.embeddings),
      totalTokens: results.reduce((sum, result) => sum + result.totalTokens, 0),
    };
  }

  /**
   * Execute function with retry logic for temporary errors
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          if (attempt < this.maxRetries) {
            console.warn(`Attempt ${attempt} failed, retrying in ${this.retryDelay}ms:`, error);
            await this.delay(this.retryDelay * attempt); // Exponential backoff
            continue;
          }
        }
        
        // Non-retryable error or max retries reached
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable (temporary network issues, rate limits, etc.)
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
    }
    return false;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EmbeddingService;
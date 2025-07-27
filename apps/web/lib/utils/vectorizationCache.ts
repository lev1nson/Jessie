interface VectorCacheEntry {
  embedding: number[];
  textChunks: any;
  metadata: any;
  timestamp: number;
  hits: number;
}

/**
 * Cache for vectorization results to avoid reprocessing identical content
 */
export class VectorizationCache {
  private cache: Map<string, VectorCacheEntry> = new Map();
  private maxSize = 500; // Maximum number of cached embeddings
  private ttlMs = 24 * 60 * 60 * 1000; // 24 hours TTL

  /**
   * Generate cache key from text content hash
   */
  private generateKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `vector_${Math.abs(hash)}`;
  }

  /**
   * Get cached vectorization result
   */
  get(text: string): VectorCacheEntry | null {
    const key = this.generateKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    return entry;
  }

  /**
   * Set cache entry
   */
  set(text: string, embedding: number[], textChunks: any, metadata: any): void {
    const key = this.generateKey(text);

    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      embedding,
      textChunks,
      metadata,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if result exists in cache
   */
  has(text: string): boolean {
    const key = this.generateKey(text);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    const entriesToRemove = Math.floor(this.maxSize * 0.1); // Remove 10% of entries
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, entriesToRemove);

    for (const [key] of sortedEntries) {
      this.cache.delete(key);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = entries.length + totalHits;
    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalHits,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Update cache configuration
   */
  configure(options: { maxSize?: number; ttlMs?: number }): void {
    if (options.maxSize !== undefined) {
      this.maxSize = Math.max(100, Math.min(options.maxSize, 5000)); // 100-5000 range
    }
    
    if (options.ttlMs !== undefined) {
      this.ttlMs = Math.max(3600000, Math.min(options.ttlMs, 604800000)); // 1hour-1week range
    }
  }
}

// Global vectorization cache instance
export const vectorizationCache = new VectorizationCache();
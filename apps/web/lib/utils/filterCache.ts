import { FilterResult } from '@jessie/lib';

interface CacheEntry {
  result: FilterResult;
  timestamp: number;
  hits: number;
}

export class FilterCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 1000; // Maximum number of cached entries
  private ttlMs = 5 * 60 * 1000; // 5 minutes TTL

  /**
   * Generate cache key from email properties
   */
  private generateKey(sender: string, subject: string, bodySnippet: string): string {
    // Use first 100 chars of body for cache key to avoid huge keys
    const snippet = bodySnippet.substring(0, 100);
    return `${sender}:${subject}:${snippet}`;
  }

  /**
   * Get cached filter result
   */
  get(sender: string, subject: string, bodyText: string): FilterResult | null {
    const key = this.generateKey(sender, subject, bodyText);
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
    
    return entry.result;
  }

  /**
   * Set cache entry
   */
  set(sender: string, subject: string, bodyText: string, result: FilterResult): void {
    const key = this.generateKey(sender, subject, bodyText);

    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if result exists in cache
   */
  has(sender: string, subject: string, bodyText: string): boolean {
    const key = this.generateKey(sender, subject, bodyText);
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
      this.maxSize = Math.max(100, Math.min(options.maxSize, 10000)); // 100-10000 range
    }
    
    if (options.ttlMs !== undefined) {
      this.ttlMs = Math.max(60000, Math.min(options.ttlMs, 3600000)); // 1min-1hour range
    }
  }
}

// Global filter cache instance
export const filterCache = new FilterCache();
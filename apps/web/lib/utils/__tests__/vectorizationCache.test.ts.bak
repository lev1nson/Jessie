import { describe, it, expect, beforeEach } from 'vitest';
import { VectorizationCache } from '../vectorizationCache';

describe('VectorizationCache', () => {
  let cache: VectorizationCache;

  beforeEach(() => {
    cache = new VectorizationCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve cached results', () => {
      const text = 'This is a test email content';
      const embedding = [1, 2, 3, 4, 5];
      const textChunks = { chunks: [], totalLength: text.length };
      const metadata = { hasAttachments: false };

      cache.set(text, embedding, textChunks, metadata);
      
      const result = cache.get(text);
      expect(result).toBeTruthy();
      expect(result?.embedding).toEqual(embedding);
      expect(result?.textChunks).toEqual(textChunks);
      expect(result?.metadata).toEqual(metadata);
    });

    it('should return null for non-existent entries', () => {
      const result = cache.get('non-existent text');
      expect(result).toBeNull();
    });

    it('should check if entry exists', () => {
      const text = 'Test content';
      const embedding = [1, 2, 3];
      
      expect(cache.has(text)).toBe(false);
      
      cache.set(text, embedding, {}, {});
      expect(cache.has(text)).toBe(true);
    });
  });

  describe('expiration', () => {
    it('should expire entries after TTL', async () => {
      // Create cache with short TTL for testing
      const shortTtlCache = new VectorizationCache();
      shortTtlCache.configure({ ttlMs: 100 }); // 100ms TTL
      
      const text = 'Expiring content';
      const embedding = [1, 2, 3];
      
      shortTtlCache.set(text, embedding, {}, {});
      expect(shortTtlCache.has(text)).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortTtlCache.has(text)).toBe(false);
      expect(shortTtlCache.get(text)).toBeNull();
    });

    it('should clean up expired entries', async () => {
      const shortTtlCache = new VectorizationCache();
      shortTtlCache.configure({ ttlMs: 50 });
      
      // Add multiple entries
      for (let i = 0; i < 5; i++) {
        shortTtlCache.set(`text${i}`, [i], {}, {});
      }
      
      expect(shortTtlCache.getStats().size).toBe(5);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const removedCount = shortTtlCache.cleanup();
      expect(removedCount).toBe(5);
      expect(shortTtlCache.getStats().size).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should evict oldest entries when cache is full', () => {
      cache.configure({ maxSize: 3 });
      
      // Fill cache to capacity
      cache.set('text1', [1], {}, {});
      cache.set('text2', [2], {}, {});
      cache.set('text3', [3], {}, {});
      
      expect(cache.getStats().size).toBe(3);
      
      // Add one more to trigger eviction
      cache.set('text4', [4], {}, {});
      
      // Should still be at max size due to eviction
      expect(cache.getStats().size).toBe(3);
      
      // First entry should be evicted
      expect(cache.has('text1')).toBe(false);
      expect(cache.has('text4')).toBe(true);
    });

    it('should clear all entries', () => {
      cache.set('text1', [1], {}, {});
      cache.set('text2', [2], {}, {});
      
      expect(cache.getStats().size).toBe(2);
      
      cache.clear();
      
      expect(cache.getStats().size).toBe(0);
      expect(cache.has('text1')).toBe(false);
      expect(cache.has('text2')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track hit statistics', () => {
      const text = 'Test content for stats';
      cache.set(text, [1, 2, 3], {}, {});
      
      // First access
      cache.get(text);
      
      // Second access
      cache.get(text);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.totalHits).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should provide cache statistics', () => {
      cache.set('text1', [1], {}, {});
      cache.set('text2', [2], {}, {});
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeGreaterThan(0);
      expect(stats.newestEntry).toBeGreaterThan(0);
    });
  });

  describe('configuration', () => {
    it('should update cache configuration', () => {
      cache.configure({ maxSize: 1000, ttlMs: 7200000 });
      
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(1000);
    });

    it('should enforce configuration limits', () => {
      // Test minimum limits
      cache.configure({ maxSize: 50, ttlMs: 1000 });
      expect(cache.getStats().maxSize).toBe(100); // Should be clamped to minimum
      
      // Test maximum limits
      cache.configure({ maxSize: 10000, ttlMs: 1000000000 });
      expect(cache.getStats().maxSize).toBe(5000); // Should be clamped to maximum
    });
  });
});
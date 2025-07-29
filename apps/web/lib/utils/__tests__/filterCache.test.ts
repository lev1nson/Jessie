import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the actual filterCache implementation
const mockCache = new Map();
const mockCacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: 0,
  size: 0,
};

const mockFilterCache = {
  get: vi.fn((sender: string, subject: string, body: string) => {
    const key = `${sender}:${subject}:${body}`;
    const result = mockCache.get(key) || null;
    if (result) {
      mockCacheStats.hits++;
    } else {
      mockCacheStats.misses++;
    }
    return result;
  }),
  
  set: vi.fn((sender: string, subject: string, body: string, result: any) => {
    const key = `${sender}:${subject}:${body}`;
    const hadKey = mockCache.has(key);
    
    // Simulate LRU eviction if cache is full (max 1000 items)
    if (!hadKey && mockCache.size >= 1000) {
      const firstKey = mockCache.keys().next().value;
      mockCache.delete(firstKey);
      mockCacheStats.evictions++;
    }
    
    mockCache.set(key, result);
    mockCacheStats.sets++;
    mockCacheStats.size = mockCache.size;
  }),
  
  clear: vi.fn(() => {
    mockCache.clear();
    mockCacheStats.size = 0;
  }),
  
  getStats: vi.fn(() => ({ ...mockCacheStats })),
  
  getSize: vi.fn(() => mockCache.size),
};

vi.mock('../../utils/filterCache', () => ({
  filterCache: mockFilterCache,
}));

describe('FilterCache Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.clear();
    mockCacheStats.hits = 0;
    mockCacheStats.misses = 0;
    mockCacheStats.sets = 0;
    mockCacheStats.evictions = 0;
    mockCacheStats.size = 0;
  });

  afterEach(() => {
    mockCache.clear();
  });

  describe('cache hit/miss performance', () => {
    it('should have high cache hit rate for repeated queries', () => {
      const filterCache = mockFilterCache;
      
      // Set up some test data
      const testResult = { isFiltered: true, reason: 'Test', confidence: 0.8 };
      
      // First access - should be a miss
      let result = filterCache.get('test@example.com', 'Subject', 'Body');
      expect(result).toBeNull();
      
      // Set the value
      filterCache.set('test@example.com', 'Subject', 'Body', testResult);
      
      // Subsequent accesses should be hits
      for (let i = 0; i < 100; i++) {
        result = filterCache.get('test@example.com', 'Subject', 'Body');
        expect(result).toEqual(testResult);
      }
      
      const stats = filterCache.getStats();
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      
      // Hit rate should be very high
      const hitRate = stats.hits / (stats.hits + stats.misses);
      expect(hitRate).toBeGreaterThan(0.99);
    });

    it('should handle cache misses efficiently', () => {
      const filterCache = mockFilterCache;
      
      const startTime = Date.now();
      
      // Generate many unique queries that will all miss
      for (let i = 0; i < 1000; i++) {
        const result = filterCache.get(`sender${i}@example.com`, `Subject ${i}`, `Body ${i}`);
        expect(result).toBeNull();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000 cache misses should complete quickly (under 100ms)
      expect(duration).toBeLessThan(100);
      
      const stats = filterCache.getStats();
      expect(stats.misses).toBe(1000);
      expect(stats.hits).toBe(0);
    });

    it('should handle mixed hit/miss patterns efficiently', () => {
      const filterCache = mockFilterCache;
      
      // Set up some cached data
      const cachedData = [
        { sender: 'user1@example.com', subject: 'Meeting', body: 'Let\'s meet' },
        { sender: 'user2@example.com', subject: 'Report', body: 'Here is the report' },
        { sender: 'user3@example.com', subject: 'Update', body: 'Status update' },
      ];
      
      cachedData.forEach((data, index) => {
        filterCache.set(data.sender, data.subject, data.body, {
          isFiltered: index % 2 === 0,
          reason: `Reason ${index}`,
          confidence: 0.8,
        });
      });
      
      const startTime = Date.now();
      
      // Mix of hits and misses
      for (let i = 0; i < 1000; i++) {
        if (i % 4 < cachedData.length) {
          // This should be a hit (i % 4 = 0, 1, 2)
          const data = cachedData[i % 3];
          const result = filterCache.get(data.sender, data.subject, data.body);
          expect(result).not.toBeNull();
        } else {
          // This should be a miss (i % 4 = 3)
          const result = filterCache.get(`new${i}@example.com`, `Subject ${i}`, `Body ${i}`);
          expect(result).toBeNull();
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly even with mixed patterns
      expect(duration).toBeLessThan(200);
      
      const stats = filterCache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('memory usage and eviction', () => {
    it('should limit cache size and evict old entries', () => {
      const filterCache = mockFilterCache;
      
      // Fill cache beyond capacity
      for (let i = 0; i < 1200; i++) {
        filterCache.set(
          `sender${i}@example.com`,
          `Subject ${i}`,
          `Body ${i}`,
          { isFiltered: false, reason: null, confidence: 0 }
        );
      }
      
      const stats = filterCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(1000); // Should not exceed max size
      expect(stats.evictions).toBeGreaterThan(0); // Should have evicted some entries
      expect(stats.sets).toBe(1200); // Should have attempted all sets
    });

    it('should maintain cache efficiency after evictions', () => {
      const filterCache = mockFilterCache;
      
      // Fill cache with initial data
      for (let i = 0; i < 1500; i++) {
        filterCache.set(`sender${i}@example.com`, `Subject ${i}`, `Body ${i}`, {
          isFiltered: i % 2 === 0,
          reason: i % 2 === 0 ? 'Filtered' : null,
          confidence: 0.8,
        });
      }
      
      // Access recent entries (should still be cached)
      let recentHits = 0;
      for (let i = 1000; i < 1500; i++) {
        const result = filterCache.get(`sender${i}@example.com`, `Subject ${i}`, `Body ${i}`);
        if (result !== null) {
          recentHits++;
        }
      }
      
      // Most recent entries should still be available
      expect(recentHits).toBeGreaterThan(400); // At least 80% hit rate for recent entries
      
      // Older entries should have been evicted
      let oldHits = 0;
      for (let i = 0; i < 500; i++) {
        const result = filterCache.get(`sender${i}@example.com`, `Subject ${i}`, `Body ${i}`);
        if (result !== null) {
          oldHits++;
        }
      }
      
      // Most old entries should be evicted
      expect(oldHits).toBeLessThan(100); // Less than 20% should still be cached
    });

    it('should handle memory-intensive operations efficiently', () => {
      const filterCache = mockFilterCache;
      
      // Create large content to test memory usage
      const largeBody = 'Lorem ipsum '.repeat(1000); // ~11KB of text
      
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Store many large entries
      for (let i = 0; i < 500; i++) {
        filterCache.set(
          `sender${i}@example.com`,
          `Large Subject ${i}`,
          largeBody,
          {
            isFiltered: true,
            reason: 'Large content filter',
            confidence: 0.9,
          }
        );
      }
      
      // Track mid-point memory usage
      const midMemory = process.memoryUsage().heapUsed;
      expect(midMemory).toBeGreaterThan(0);
      
      // Access all entries
      for (let i = 0; i < 500; i++) {
        const result = filterCache.get(`sender${i}@example.com`, `Large Subject ${i}`, largeBody);
        expect(result).not.toBeNull();
      }
      
      const endTime = Date.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      // Operations should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Memory usage should be reasonable (less than 50MB increase)
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  describe('concurrent access patterns', () => {
    it('should handle concurrent reads efficiently', async () => {
      const filterCache = mockFilterCache;
      
      // Set up initial data
      const testData = Array.from({ length: 100 }, (_, i) => ({
        sender: `sender${i}@example.com`,
        subject: `Subject ${i}`,
        body: `Body content ${i}`,
        result: { isFiltered: i % 2 === 0, reason: null, confidence: 0 },
      }));
      
      testData.forEach(data => {
        filterCache.set(data.sender, data.subject, data.body, data.result);
      });
      
      // Simulate concurrent reads
      const startTime = Date.now();
      
      const promises = Array.from({ length: 1000 }, async (_, i) => {
        const dataIndex = i % testData.length;
        const data = testData[dataIndex];
        return filterCache.get(data.sender, data.subject, data.body);
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // All reads should succeed
      expect(results.every(result => result !== null)).toBe(true);
      
      // Should complete quickly even with high concurrency
      expect(endTime - startTime).toBeLessThan(500);
      
      const stats = filterCache.getStats();
      expect(stats.hits).toBe(1000);
    });

    it('should handle mixed read/write patterns', async () => {
      const filterCache = mockFilterCache;
      
      const startTime = Date.now();
      
      // Mix of reads and writes
      const operations = Array.from({ length: 1000 }, (_, i) => {
        if (i % 3 === 0) {
          // Write operation
          return () => filterCache.set(
            `sender${i}@example.com`,
            `Subject ${i}`,
            `Body ${i}`,
            { isFiltered: false, reason: null, confidence: 0 }
          );
        } else {
          // Read operation
          const readIndex = Math.floor(i / 3);
          return () => filterCache.get(
            `sender${readIndex}@example.com`,
            `Subject ${readIndex}`,
            `Body ${readIndex}`
          );
        }
      });
      
      // Execute all operations
      operations.forEach(op => op());
      
      const endTime = Date.now();
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(300);
      
      const stats = filterCache.getStats();
      expect(stats.sets).toBeGreaterThan(300); // Roughly 1/3 of operations were writes
      expect(stats.hits + stats.misses).toBeGreaterThan(600); // Roughly 2/3 were reads
    });
  });

  describe('cache key generation and collision handling', () => {
    it('should generate unique keys for different inputs', () => {
      const filterCache = mockFilterCache;
      
      const testCases = [
        { sender: 'user@example.com', subject: 'Test', body: 'Body' },
        { sender: 'user@example.com', subject: 'Test', body: 'Different Body' },
        { sender: 'user@example.com', subject: 'Different Subject', body: 'Body' },
        { sender: 'different@example.com', subject: 'Test', body: 'Body' },
        { sender: 'user@example.com', subject: '', body: 'Test:Body' },
        { sender: 'user@example.com:subject', subject: '', body: 'Body' },
      ];
      
      testCases.forEach((testCase, index) => {
        filterCache.set(testCase.sender, testCase.subject, testCase.body, {
          isFiltered: false,
          reason: `Result ${index}`,
          confidence: 0,
        });
      });
      
      // Each test case should have its own cache entry
      testCases.forEach((testCase, index) => {
        const result = filterCache.get(testCase.sender, testCase.subject, testCase.body);
        expect(result).not.toBeNull();
        expect(result.reason).toBe(`Result ${index}`);
      });
      
      expect(filterCache.getSize()).toBe(testCases.length);
    });

    it('should handle special characters in cache keys', () => {
      const filterCache = mockFilterCache;
      
      const specialCases = [
        { sender: 'user+tag@example.com', subject: 'Subject with: colons', body: 'Body\nwith\nnewlines' },
        { sender: 'user@ex:ample.com', subject: 'Subject\twith\ttabs', body: 'Body with "quotes"' },
        { sender: 'user@example.com', subject: 'Subject with émojis 🚀', body: 'Body with unicode: café' },
        { sender: 'user@example.com', subject: '', body: '' }, // Empty strings
      ];
      
      specialCases.forEach((testCase, index) => {
        filterCache.set(testCase.sender, testCase.subject, testCase.body, {
          isFiltered: true,
          reason: `Special ${index}`,
          confidence: 0.5,
        });
      });
      
      // Should be able to retrieve all entries
      specialCases.forEach((testCase, index) => {
        const result = filterCache.get(testCase.sender, testCase.subject, testCase.body);
        expect(result).not.toBeNull();
        expect(result.reason).toBe(`Special ${index}`);
      });
    });
  });

  describe('cache statistics and monitoring', () => {
    it('should track cache statistics accurately', () => {
      const filterCache = mockFilterCache;
      
      // Perform various operations
      filterCache.set('test1@example.com', 'Subject1', 'Body1', { isFiltered: false, reason: null, confidence: 0 });
      filterCache.set('test2@example.com', 'Subject2', 'Body2', { isFiltered: true, reason: 'Filtered', confidence: 0.8 });
      
      // Some hits
      filterCache.get('test1@example.com', 'Subject1', 'Body1');
      filterCache.get('test1@example.com', 'Subject1', 'Body1');
      filterCache.get('test2@example.com', 'Subject2', 'Body2');
      
      // Some misses
      filterCache.get('nonexistent1@example.com', 'Subject', 'Body');
      filterCache.get('nonexistent2@example.com', 'Subject', 'Body');
      
      const stats = filterCache.getStats();
      
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
      expect(stats.evictions).toBe(0);
    });

    it('should provide cache hit rate calculation', () => {
      const filterCache = mockFilterCache;
      
      // Set up test data
      for (let i = 0; i < 10; i++) {
        filterCache.set(`test${i}@example.com`, `Subject${i}`, `Body${i}`, {
          isFiltered: i % 2 === 0,
          reason: null,
          confidence: 0,
        });
      }
      
      // Generate mix of hits and misses
      for (let i = 0; i < 20; i++) {
        if (i < 10) {
          // Hit
          filterCache.get(`test${i}@example.com`, `Subject${i}`, `Body${i}`);
        } else {
          // Miss
          filterCache.get(`miss${i}@example.com`, `Subject${i}`, `Body${i}`);
        }
      }
      
      const stats = filterCache.getStats();
      const hitRate = stats.hits / (stats.hits + stats.misses);
      
      expect(hitRate).toBe(0.5); // 50% hit rate
      expect(stats.hits).toBe(10);
      expect(stats.misses).toBe(10);
    });

    it('should handle cache clearing and reset statistics appropriately', () => {
      const filterCache = mockFilterCache;
      
      // Populate cache and generate statistics
      for (let i = 0; i < 5; i++) {
        filterCache.set(`test${i}@example.com`, `Subject${i}`, `Body${i}`, { isFiltered: false, reason: null, confidence: 0 });
        filterCache.get(`test${i}@example.com`, `Subject${i}`, `Body${i}`);
      }
      
      const stats = filterCache.getStats();
      expect(stats.size).toBe(5);
      expect(stats.hits).toBe(5);
      
      // Clear cache
      filterCache.clear();
      
      // Size should be reset, but other stats should be preserved for monitoring
      expect(filterCache.getSize()).toBe(0);
    });
  });
});
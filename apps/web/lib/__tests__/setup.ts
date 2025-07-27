/**
 * Test setup and configuration for content filtering tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test configuration
const TEST_CONFIG = {
  // Timeout for long-running tests (performance tests)
  PERFORMANCE_TEST_TIMEOUT: 30000, // 30 seconds
  
  // Memory usage thresholds
  MAX_MEMORY_USAGE_MB: 100,
  
  // Performance thresholds
  MAX_PROCESSING_TIME_MS: 5000,
  
  // Cache settings for tests
  CACHE_SIZE_LIMIT: 1000,
  
  // File size limits for testing
  MAX_PDF_SIZE_MB: 10,
  MAX_DOCX_SIZE_MB: 5,
  
  // Batch processing limits
  MAX_CONCURRENT_PROCESSING: 5,
  MAX_BATCH_SIZE: 1000,
};

// Global test state
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let testStartTime: number;
let initialMemoryUsage: number;

/**
 * Global setup for all tests
 */
beforeAll(() => {
  // Store original console methods
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  
  // Set up test environment
  process.env.NODE_ENV = 'test';
  
  // Initialize performance monitoring
  initialMemoryUsage = process.memoryUsage().heapUsed;
  
  console.log('🧪 Content Filtering Test Suite Initialized');
  console.log(`📊 Initial Memory Usage: ${(initialMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
});

/**
 * Global cleanup after all tests
 */
afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Final memory check
  const finalMemoryUsage = process.memoryUsage().heapUsed;
  const memoryIncrease = (finalMemoryUsage - initialMemoryUsage) / 1024 / 1024;
  
  console.log('🏁 Content Filtering Test Suite Completed');
  console.log(`📊 Final Memory Usage: ${(finalMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📈 Memory Increase: ${memoryIncrease.toFixed(2)} MB`);
  
  if (memoryIncrease > TEST_CONFIG.MAX_MEMORY_USAGE_MB) {
    console.warn(`⚠️  Memory usage exceeded threshold: ${memoryIncrease.toFixed(2)} MB > ${TEST_CONFIG.MAX_MEMORY_USAGE_MB} MB`);
  }
});

/**
 * Setup for each test
 */
beforeEach(() => {
  testStartTime = Date.now();
  
  // Suppress console errors/warnings in tests unless explicitly testing error handling
  console.error = () => {};
  console.warn = () => {};
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Restore console methods for next test
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Check test performance
  const testDuration = Date.now() - testStartTime;
  if (testDuration > TEST_CONFIG.MAX_PROCESSING_TIME_MS) {
    console.warn(`⚠️  Test took longer than expected: ${testDuration}ms > ${TEST_CONFIG.MAX_PROCESSING_TIME_MS}ms`);
  }
});

/**
 * Utility function to temporarily restore console for error testing
 */
export function withConsole<T>(fn: () => T): T {
  const prevError = console.error;
  const prevWarn = console.warn;
  
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  try {
    return fn();
  } finally {
    console.error = prevError;
    console.warn = prevWarn;
  }
}

/**
 * Memory usage assertion helper
 */
export function expectMemoryUsage(fn: () => void | Promise<void>, maxMB: number = 10) {
  return async () => {
    const startMemory = process.memoryUsage().heapUsed;
    
    await fn();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024 / 1024;
    
    if (memoryUsed > maxMB) {
      throw new Error(`Memory usage exceeded limit: ${memoryUsed.toFixed(2)} MB > ${maxMB} MB`);
    }
  };
}

/**
 * Performance assertion helper
 */
export function expectPerformance<T>(fn: () => T | Promise<T>, maxMs: number = 1000) {
  return async (): Promise<T> => {
    const startTime = process.hrtime.bigint();
    
    const result = await fn();
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    if (duration > maxMs) {
      throw new Error(`Performance exceeded limit: ${duration.toFixed(2)}ms > ${maxMs}ms`);
    }
    
    return result;
  };
}

/**
 * Create a performance test wrapper
 */
export function performanceTest(name: string, fn: () => void | Promise<void>, maxMs: number = 5000) {
  return {
    name: `[PERF] ${name}`,
    fn: expectPerformance(fn, maxMs),
  };
}

/**
 * Create a memory test wrapper
 */
export function memoryTest(name: string, fn: () => void | Promise<void>, maxMB: number = 10) {
  return {
    name: `[MEM] ${name}`,
    fn: expectMemoryUsage(fn, maxMB),
  };
}

/**
 * Test data cleanup helper
 */
export function cleanupTestData() {
  // Clear any test caches
  if (global.gc) {
    global.gc();
  }
  
  // Reset any global state that might affect other tests
  // This can be extended as needed
}

/**
 * Mock function reset helper
 */
export function resetAllMocks() {
  // This would be called in beforeEach if using a mocking library
  // For now, it's a placeholder for future mock resets
}

/**
 * Export test configuration for use in tests
 */
export { TEST_CONFIG };

/**
 * Test environment validation
 */
export function validateTestEnvironment() {
  const requirements = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryLimit: process.env.NODE_OPTIONS?.includes('--max-old-space-size'),
  };
  
  console.log('🔍 Test Environment:');
  console.log(`   Node.js: ${requirements.nodeVersion}`);
  console.log(`   Platform: ${requirements.platform} ${requirements.arch}`);
  console.log(`   Memory Limit: ${requirements.memoryLimit ? 'Set' : 'Default'}`);
  
  return requirements;
}

// Validate environment on import
validateTestEnvironment();
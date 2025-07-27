interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  peakMemory?: number;
}

interface ProcessingStats {
  totalEmails: number;
  filteredEmails: number;
  processedAttachments: number;
  averageProcessingTime: number;
  errorRate: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private processingStats: ProcessingStats = {
    totalEmails: 0,
    filteredEmails: 0,
    processedAttachments: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    memoryUsage: {
      initial: 0,
      peak: 0,
      final: 0,
    },
  };

  /**
   * Start monitoring a process
   */
  startTimer(processId: string): void {
    this.metrics.set(processId, {
      startTime: Date.now(),
      memoryUsed: this.getMemoryUsage(),
    });
  }

  /**
   * End monitoring a process
   */
  endTimer(processId: string): number {
    const metric = this.metrics.get(processId);
    if (!metric) {
      console.warn(`Timer ${processId} not found`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    const currentMemory = this.getMemoryUsage();

    metric.endTime = endTime;
    metric.duration = duration;
    metric.peakMemory = Math.max(metric.memoryUsed || 0, currentMemory);

    return duration;
  }

  /**
   * Get duration for a process
   */
  getDuration(processId: string): number {
    const metric = this.metrics.get(processId);
    return metric?.duration || 0;
  }

  /**
   * Clear all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.processingStats = {
      totalEmails: 0,
      filteredEmails: 0,
      processedAttachments: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      memoryUsage: {
        initial: 0,
        peak: 0,
        final: 0,
      },
    };
  }

  /**
   * Update processing statistics
   */
  updateStats(stats: Partial<ProcessingStats>): void {
    Object.assign(this.processingStats, stats);
  }

  /**
   * Get current processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100; // MB with 2 decimal places
  }

  /**
   * Log performance metrics
   */
  logMetrics(userId: string): void {
    const totalDuration = Array.from(this.metrics.values())
      .reduce((sum, metric) => sum + (metric.duration || 0), 0);

    console.log(`Performance metrics for user ${userId}:`, {
      totalProcessingTime: `${totalDuration}ms`,
      emailsProcessed: this.processingStats.totalEmails,
      emailsFiltered: this.processingStats.filteredEmails,
      attachmentsProcessed: this.processingStats.processedAttachments,
      averageTimePerEmail: this.processingStats.totalEmails > 0 
        ? `${Math.round(totalDuration / this.processingStats.totalEmails)}ms`
        : '0ms',
      memoryUsage: this.processingStats.memoryUsage,
      errorRate: `${(this.processingStats.errorRate * 100).toFixed(1)}%`,
    });
  }

  /**
   * Check if performance is within acceptable limits
   */
  checkPerformanceLimits(): {
    memoryOk: boolean;
    timeOk: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let memoryOk = true;
    let timeOk = true;

    // Check memory usage (warn if > 200MB, error if > 500MB)
    const peakMemory = this.processingStats.memoryUsage.peak;
    if (peakMemory > 500) {
      warnings.push(`Critical memory usage: ${peakMemory}MB`);
      memoryOk = false;
    } else if (peakMemory > 200) {
      warnings.push(`High memory usage: ${peakMemory}MB`);
    }

    // Check processing time per email (warn if > 5s, error if > 15s)
    const avgTime = this.processingStats.averageProcessingTime;
    if (avgTime > 15000) {
      warnings.push(`Critical processing time: ${avgTime}ms per email`);
      timeOk = false;
    } else if (avgTime > 5000) {
      warnings.push(`Slow processing time: ${avgTime}ms per email`);
    }

    // Check error rate (warn if > 5%, error if > 15%)
    const errorRate = this.processingStats.errorRate;
    if (errorRate > 0.15) {
      warnings.push(`Critical error rate: ${(errorRate * 100).toFixed(1)}%`);
    } else if (errorRate > 0.05) {
      warnings.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    return { memoryOk, timeOk, warnings };
  }

  /**
   * Get performance summary for reporting
   */
  getSummary(): {
    duration: number;
    emailsPerSecond: number;
    memoryEfficiency: number;
    successRate: number;
  } {
    const totalDuration = Array.from(this.metrics.values())
      .reduce((sum, metric) => sum + (metric.duration || 0), 0);

    const emailsPerSecond = this.processingStats.totalEmails > 0 
      ? (this.processingStats.totalEmails / (totalDuration / 1000))
      : 0;

    const memoryEfficiency = this.processingStats.memoryUsage.peak > 0
      ? this.processingStats.totalEmails / this.processingStats.memoryUsage.peak
      : 0;

    const successRate = 1 - this.processingStats.errorRate;

    return {
      duration: totalDuration,
      emailsPerSecond,
      memoryEfficiency,
      successRate,
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
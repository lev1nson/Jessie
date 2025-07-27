import { AttachmentProcessor } from '../parsers/attachmentProcessor';
import { AttachmentInfo, ParsedAttachment } from '@jessie/lib';

interface ProcessingJob {
  id: string;
  attachments: Array<{ buffer: Buffer; info: AttachmentInfo }>;
  callback: (results: ProcessingResult) => void;
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
}

interface ProcessingResult {
  jobId: string;
  processed: ParsedAttachment[];
  errors: Array<{ attachment: AttachmentInfo; error: string }>;
  skipped: Array<{ attachment: AttachmentInfo; reason: string }>;
  stats: {
    total: number;
    processed: number;
    errors: number;
    skipped: number;
    processingTime: number;
  };
}

/**
 * Async attachment processor with queue management for large file processing
 */
export class AsyncAttachmentProcessor {
  private attachmentProcessor: AttachmentProcessor;
  private processingQueue: ProcessingJob[] = [];
  private isProcessing = false;
  private maxConcurrent = 3;
  private activeJobs = 0;
  private stats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
  };

  constructor(attachmentProcessor?: AttachmentProcessor) {
    this.attachmentProcessor = attachmentProcessor || new AttachmentProcessor();
  }

  /**
   * Add attachments to processing queue
   */
  async queueAttachments(
    attachments: Array<{ buffer: Buffer; info: AttachmentInfo }>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    return new Promise<string>((resolve) => {
      const job: ProcessingJob = {
        id: jobId,
        attachments,
        callback: () => {
          // Job completed, results handled via callback
        },
        priority,
        createdAt: Date.now(),
      };

      this.processingQueue.push(job);
      this.sortQueueByPriority();
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }

      resolve(jobId);
    });
  }

  /**
   * Process attachments synchronously (non-queued)
   */
  async processAttachmentsSync(
    attachments: Array<{ buffer: Buffer; info: AttachmentInfo }>
  ): Promise<ProcessingResult> {
    const jobId = this.generateJobId();
    const startTime = Date.now();

    try {
      const result = await this.attachmentProcessor.processAttachments(attachments);
      const processingTime = Date.now() - startTime;

      return {
        jobId,
        processed: result.processed,
        errors: result.errors,
        skipped: result.skipped,
        stats: {
          ...result.stats,
          processingTime,
        },
      };
    } catch (error) {
      throw new Error(`Sync processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const job = this.processingQueue.shift();
      if (!job) continue;

      this.activeJobs++;
      this.stats.totalJobs++;

      // Process job asynchronously
      this.processJob(job).finally(() => {
        this.activeJobs--;
        
        // Continue processing queue
        if (this.processingQueue.length > 0) {
          this.processQueue();
        } else if (this.activeJobs === 0) {
          this.isProcessing = false;
        }
      });
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.attachmentProcessor.processAttachments(job.attachments);
      const processingTime = Date.now() - startTime;

      const processingResult: ProcessingResult = {
        jobId: job.id,
        processed: result.processed,
        errors: result.errors,
        skipped: result.skipped,
        stats: {
          ...result.stats,
          processingTime,
        },
      };

      this.stats.completedJobs++;
      this.updateAverageProcessingTime(processingTime);

      // Call job callback
      job.callback(processingResult);

    } catch (error) {
      this.stats.failedJobs++;
      
      const errorResult: ProcessingResult = {
        jobId: job.id,
        processed: [],
        errors: job.attachments.map(({ info }) => ({
          attachment: info,
          error: error instanceof Error ? error.message : 'Unknown processing error',
        })),
        skipped: [],
        stats: {
          total: job.attachments.length,
          processed: 0,
          errors: job.attachments.length,
          skipped: 0,
          processingTime: Date.now() - startTime,
        },
      };

      job.callback(errorResult);
    }
  }

  /**
   * Sort queue by priority (high -> normal -> low) and creation time
   */
  private sortQueueByPriority(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    this.processingQueue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time (older first)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    if (this.stats.completedJobs === 1) {
      this.stats.averageProcessingTime = newTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.completedJobs - 1) + newTime) / 
        this.stats.completedJobs;
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    queue: {
      pending: number;
      active: number;
      maxConcurrent: number;
    };
    performance: typeof this.stats;
  } {
    return {
      queue: {
        pending: this.processingQueue.length,
        active: this.activeJobs,
        maxConcurrent: this.maxConcurrent,
      },
      performance: { ...this.stats },
    };
  }

  /**
   * Update processing configuration
   */
  configure(options: { maxConcurrent?: number }): void {
    if (options.maxConcurrent !== undefined) {
      this.maxConcurrent = Math.max(1, Math.min(options.maxConcurrent, 10));
    }
  }

  /**
   * Clear queue and reset stats
   */
  clear(): void {
    this.processingQueue = [];
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    isProcessing: boolean;
    queueLength: number;
    activeJobs: number;
    nextJob?: {
      id: string;
      priority: string;
      attachmentCount: number;
      waitTime: number;
    };
  } {
    const nextJob = this.processingQueue[0];
    
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs,
      nextJob: nextJob ? {
        id: nextJob.id,
        priority: nextJob.priority,
        attachmentCount: nextJob.attachments.length,
        waitTime: Date.now() - nextJob.createdAt,
      } : undefined,
    };
  }
}

export default AsyncAttachmentProcessor;
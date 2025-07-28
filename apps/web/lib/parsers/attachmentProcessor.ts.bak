import { lookup } from 'mime-types';
import { PdfParser } from './pdfParser';
import { DocxParser } from './docxParser';
import { ParsedAttachment, AttachmentInfo } from '@jessie/lib';

export interface ProcessorResult {
  success: boolean;
  parsedAttachment?: ParsedAttachment;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export class AttachmentProcessor {
  private pdfParser: PdfParser;
  private docxParser: DocxParser;
  
  // Security constraints
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxConcurrentProcessing = 5;
  private supportedMimeTypes: Set<string>;

  constructor() {
    this.pdfParser = new PdfParser();
    this.docxParser = new DocxParser();
    
    this.supportedMimeTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.ms-word.template.macroEnabled.12',
    ]);
  }

  /**
   * Detect supported attachment types from email metadata
   */
  detectSupportedAttachments(attachments: AttachmentInfo[]): {
    supported: AttachmentInfo[];
    unsupported: AttachmentInfo[];
    totalSize: number;
  } {
    const supported: AttachmentInfo[] = [];
    const unsupported: AttachmentInfo[] = [];
    let totalSize = 0;

    for (const attachment of attachments) {
      totalSize += attachment.size;
      
      if (this.isAttachmentSupported(attachment)) {
        supported.push(attachment);
      } else {
        unsupported.push(attachment);
      }
    }

    return { supported, unsupported, totalSize };
  }

  /**
   * Check if attachment is supported for processing
   */
  isAttachmentSupported(attachment: AttachmentInfo): boolean {
    if (!attachment || !attachment.mime_type || !attachment.filename) {
      return false;
    }

    // Check file size
    if (attachment.size > this.maxFileSize) {
      return false;
    }

    // Check MIME type
    if (this.supportedMimeTypes.has(attachment.mime_type.toLowerCase())) {
      return true;
    }

    // Check file extension as fallback
    const mimeFromExtension = lookup(attachment.filename);
    if (mimeFromExtension && this.supportedMimeTypes.has(mimeFromExtension)) {
      return true;
    }

    return false;
  }

  /**
   * Process a single attachment
   */
  async processAttachment(
    buffer: Buffer, 
    attachment: AttachmentInfo
  ): Promise<ProcessorResult> {
    try {
      // Validate attachment
      const validation = this.validateAttachment(buffer, attachment);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Skip if not supported
      if (!this.isAttachmentSupported(attachment)) {
        return {
          success: true,
          skipped: true,
          reason: `Unsupported file type: ${attachment.mime_type}`,
        };
      }

      // Process based on file type
      let parsedAttachment: ParsedAttachment;

      if (this.isPdfFile(attachment)) {
        parsedAttachment = await this.pdfParser.parsePdfAttachment(
          buffer, 
          attachment.filename, 
          attachment.id
        );
      } else if (this.isDocxFile(attachment)) {
        parsedAttachment = await this.docxParser.parseDocxAttachment(
          buffer, 
          attachment.filename, 
          attachment.id
        );
      } else {
        return {
          success: false,
          error: `Unsupported attachment type: ${attachment.mime_type}`,
        };
      }

      return {
        success: true,
        parsedAttachment,
      };

    } catch (error) {
      console.error('Error processing attachment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
      };
    }
  }

  /**
   * Process multiple attachments with concurrency control
   */
  async processAttachments(
    attachmentData: Array<{ buffer: Buffer; info: AttachmentInfo }>
  ): Promise<{
    processed: ParsedAttachment[];
    errors: Array<{ attachment: AttachmentInfo; error: string }>;
    skipped: Array<{ attachment: AttachmentInfo; reason: string }>;
    stats: {
      total: number;
      processed: number;
      errors: number;
      skipped: number;
    };
  }> {
    const processed: ParsedAttachment[] = [];
    const errors: Array<{ attachment: AttachmentInfo; error: string }> = [];
    const skipped: Array<{ attachment: AttachmentInfo; reason: string }> = [];

    // Process in batches to control concurrency
    const batchSize = this.maxConcurrentProcessing;
    
    for (let i = 0; i < attachmentData.length; i += batchSize) {
      const batch = attachmentData.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async ({ buffer, info }) => {
        const result = await this.processAttachment(buffer, info);
        
        if (result.success && result.parsedAttachment) {
          processed.push(result.parsedAttachment);
        } else if (result.skipped) {
          skipped.push({ 
            attachment: info, 
            reason: result.reason || 'Unknown reason' 
          });
        } else {
          errors.push({ 
            attachment: info, 
            error: result.error || 'Unknown error' 
          });
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    const stats = {
      total: attachmentData.length,
      processed: processed.length,
      errors: errors.length,
      skipped: skipped.length,
    };

    return { processed, errors, skipped, stats };
  }

  /**
   * Validate attachment buffer and metadata
   */
  private validateAttachment(
    buffer: Buffer, 
    attachment: AttachmentInfo
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check buffer
    if (!buffer || buffer.length === 0) {
      errors.push('Empty attachment buffer');
      return { isValid: false, errors }; // Early return to prevent further null access
    }

    // Check attachment metadata
    if (!attachment) {
      errors.push('Missing attachment metadata');
      return { isValid: false, errors };
    }

    // Check size consistency
    if (buffer.length !== attachment.size) {
      errors.push(`Size mismatch: buffer ${buffer.length} vs metadata ${attachment.size}`);
    }

    // Check file size limits
    if (attachment.size > this.maxFileSize) {
      errors.push(`File too large: ${attachment.size} bytes (max: ${this.maxFileSize})`);
    }

    // Validate filename
    if (!attachment.filename || attachment.filename.trim() === '') {
      errors.push('Missing filename');
    }

    // Additional validation based on file type
    if (this.isPdfFile(attachment)) {
      const pdfValidation = this.pdfParser.validatePdf(buffer, attachment.filename);
      if (!pdfValidation.isValid) {
        errors.push(...pdfValidation.errors.map(e => `PDF: ${e}`));
      }
    } else if (this.isDocxFile(attachment)) {
      const docxValidation = this.docxParser.validateDocx(buffer, attachment.filename);
      if (!docxValidation.isValid) {
        errors.push(...docxValidation.errors.map(e => `DOCX: ${e}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if attachment is a PDF file
   */
  private isPdfFile(attachment: AttachmentInfo): boolean {
    if (!attachment || !attachment.mime_type || !attachment.filename) {
      return false;
    }
    return attachment.mime_type.toLowerCase() === 'application/pdf' ||
           attachment.filename.toLowerCase().endsWith('.pdf');
  }

  /**
   * Check if attachment is a DOCX file
   */
  private isDocxFile(attachment: AttachmentInfo): boolean {
    if (!attachment || !attachment.mime_type || !attachment.filename) {
      return false;
    }

    const docxMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      'application/vnd.ms-word.document.macroenabled.12',
      'application/vnd.ms-word.template.macroenabled.12',
    ];

    const docxExtensions = ['.docx', '.dotx', '.docm', '.dotm'];

    return docxMimeTypes.some(type => 
      attachment.mime_type.toLowerCase().includes(type.toLowerCase())
    ) || docxExtensions.some(ext => 
      attachment.filename.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Get processing statistics for monitoring
   */
  getProcessingStats(): {
    supportedTypes: string[];
    maxFileSize: number;
    maxConcurrentProcessing: number;
  } {
    return {
      supportedTypes: Array.from(this.supportedMimeTypes),
      maxFileSize: this.maxFileSize,
      maxConcurrentProcessing: this.maxConcurrentProcessing,
    };
  }

  /**
   * Update processing limits (for configuration)
   */
  updateLimits(config: {
    maxFileSize?: number;
    maxConcurrentProcessing?: number;
  }): void {
    if (config.maxFileSize !== undefined) {
      this.maxFileSize = Math.max(1024, Math.min(config.maxFileSize, 50 * 1024 * 1024)); // 1KB to 50MB
    }
    
    if (config.maxConcurrentProcessing !== undefined) {
      this.maxConcurrentProcessing = Math.max(1, Math.min(config.maxConcurrentProcessing, 10)); // 1 to 10
    }
  }
}
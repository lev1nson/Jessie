import pdf from 'pdf-parse';
import { ParsedAttachment } from '@jessie/lib';

export interface PdfParseResult {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modDate?: string;
  };
  info: {
    fileSize: number;
    wordCount: number;
    hasImages: boolean;
    isScanned: boolean;
  };
}

export class PdfParser {
  private maxFileSize = 10 * 1024 * 1024; // 10MB limit
  private maxPages = 100; // Limit processing to first 100 pages

  /**
   * Parse PDF buffer and extract text content
   */
  async parsePdf(buffer: Buffer, filename: string): Promise<PdfParseResult> {
    try {
      // Check file size
      if (buffer.length > this.maxFileSize) {
        throw new Error(`PDF file too large: ${buffer.length} bytes (max: ${this.maxFileSize})`);
      }

      // Configure pdf-parse options
      const options = {
        max: this.maxPages, // Limit pages processed
        version: 'v1.10.100', // Specify pdf2pic version if needed
      };

      // Parse PDF
      const data = await pdf(buffer, options);

      // Extract and clean text
      const cleanText = this.cleanPdfText(data.text);
      
      // Analyze content
      const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
      const isScanned = this.detectScannedPdf(cleanText, data.numpages);
      
      // Extract metadata
      const metadata = this.extractMetadata(data.info);

      return {
        text: cleanText,
        pages: data.numpages,
        metadata,
        info: {
          fileSize: buffer.length,
          wordCount,
          hasImages: false, // pdf-parse doesn't provide image info easily
          isScanned,
        },
      };

    } catch (error) {
      console.error('Error parsing PDF:', error);
      
      // Return empty result with error info
      return {
        text: `[Error parsing PDF: ${filename}]`,
        pages: 0,
        metadata: {},
        info: {
          fileSize: buffer.length,
          wordCount: 0,
          hasImages: false,
          isScanned: false,
        },
      };
    }
  }

  /**
   * Parse PDF attachment from email
   */
  async parsePdfAttachment(
    buffer: Buffer, 
    filename: string, 
    attachmentId: string
  ): Promise<ParsedAttachment> {
    const parseResult = await this.parsePdf(buffer, filename);
    
    return {
      filename,
      mime_type: 'application/pdf',
      size: buffer.length,
      content: parseResult.text,
      attachment_id: attachmentId,
    };
  }

  /**
   * Clean and normalize extracted PDF text
   */
  private cleanPdfText(text: string): string {
    if (!text || text.trim() === '') {
      return '';
    }

    return text
      // Fix common PDF extraction issues
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\f/g, '\n') // Replace form feeds with newlines
      
      // Fix broken words (common in PDF extraction)
      .replace(/(\w)-\n(\w)/g, '$1$2') // Remove hyphenation at line breaks
      .replace(/(\w)\n(\w)/g, '$1 $2') // Add space between words split across lines
      
      // Clean up spacing
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/\n[ \t]+/g, '\n') // Remove leading whitespace on lines
      .replace(/[ \t]+\n/g, '\n') // Remove trailing whitespace on lines
      
      // Fix paragraph breaks
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .replace(/([.!?])\n([A-Z])/g, '$1\n\n$2') // Add paragraph break after sentences
      
      // Clean up common PDF artifacts
      .replace(/\s*\n\s*\n\s*/g, '\n\n') // Clean up paragraph breaks
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between concatenated words
      
      .trim();
  }

  /**
   * Detect if PDF is likely a scanned document (low text content)
   */
  private detectScannedPdf(text: string, pages: number): boolean {
    if (pages === 0) return false;
    
    const textLength = text.trim().length;
    const avgCharsPerPage = textLength / pages;
    
    // If average characters per page is very low, likely scanned
    return avgCharsPerPage < 100;
  }

  /**
   * Extract metadata from PDF info object
   */
  private extractMetadata(info: any): PdfParseResult['metadata'] {
    const metadata: PdfParseResult['metadata'] = {};

    try {
      if (info) {
        if (info.Title) metadata.title = String(info.Title).trim();
        if (info.Author) metadata.author = String(info.Author).trim();
        if (info.Subject) metadata.subject = String(info.Subject).trim();
        if (info.Creator) metadata.creator = String(info.Creator).trim();
        if (info.Producer) metadata.producer = String(info.Producer).trim();
        
        // Handle dates
        if (info.CreationDate) {
          try {
            const date = new Date(info.CreationDate);
            if (!isNaN(date.getTime())) {
              metadata.creationDate = date.toISOString();
            }
          } catch {
            // Ignore date parsing errors
          }
        }
        
        if (info.ModDate) {
          try {
            const date = new Date(info.ModDate);
            if (!isNaN(date.getTime())) {
              metadata.modDate = date.toISOString();
            }
          } catch {
            // Ignore date parsing errors
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting PDF metadata:', error);
    }

    return metadata;
  }

  /**
   * Validate PDF buffer
   */
  validatePdf(buffer: Buffer, filename: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (buffer.length === 0) {
      errors.push('Empty file');
    }

    if (buffer.length > this.maxFileSize) {
      errors.push(`File too large: ${buffer.length} bytes (max: ${this.maxFileSize})`);
    }

    // Check PDF header
    if (buffer.length >= 4) {
      const header = buffer.toString('ascii', 0, 4);
      if (header !== '%PDF') {
        errors.push('Invalid PDF header');
      }
    } else {
      errors.push('File too small to be a valid PDF');
    }

    // Check filename extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      errors.push('File does not have .pdf extension');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return ['application/pdf'];
  }

  /**
   * Check if file is supported
   */
  isSupported(mimeType: string, filename: string): boolean {
    const supportedTypes = this.getSupportedMimeTypes();
    const hasValidMimeType = supportedTypes.includes(mimeType.toLowerCase());
    const hasValidExtension = filename.toLowerCase().endsWith('.pdf');
    
    return hasValidMimeType || hasValidExtension;
  }
}
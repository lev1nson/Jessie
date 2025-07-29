import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentProcessor, ProcessorResult } from '../attachmentProcessor';
import { AttachmentInfo } from '@jessie/lib';

// Mock mime-types
vi.mock('mime-types', () => ({
  lookup: vi.fn(),
}));

// Mock parsers
const mockPdfParser = {
  parsePdfAttachment: vi.fn(),
  validatePdf: vi.fn(),
};

const mockDocxParser = {
  parseDocxAttachment: vi.fn(),
  validateDocx: vi.fn(),
};

vi.mock('../pdfParser', () => ({
  PdfParser: vi.fn().mockImplementation(() => mockPdfParser),
}));

vi.mock('../docxParser', () => ({
  DocxParser: vi.fn().mockImplementation(() => mockDocxParser),
}));

describe('AttachmentProcessor', () => {
  let attachmentProcessor: AttachmentProcessor;
  let mockPdfBuffer: Buffer;
  let mockDocxBuffer: Buffer;
  let mockPdfAttachment: AttachmentInfo;
  let mockDocxAttachment: AttachmentInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    attachmentProcessor = new AttachmentProcessor();
    
    // Create mock buffers
    mockPdfBuffer = Buffer.from('%PDF-1.4\nMock PDF content');
    mockDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, ...Buffer.from('Mock DOCX content')]);
    
    // Create mock attachments
    mockPdfAttachment = {
      id: 'pdf-123',
      filename: 'document.pdf',
      mime_type: 'application/pdf',
      size: mockPdfBuffer.length,
    };
    
    mockDocxAttachment = {
      id: 'docx-456',
      filename: 'document.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: mockDocxBuffer.length,
    };
    
    // Setup default parser mocks
    mockPdfParser.validatePdf.mockReturnValue({ isValid: true, errors: [] });
    mockDocxParser.validateDocx.mockReturnValue({ isValid: true, errors: [] });
    
    mockPdfParser.parsePdfAttachment.mockResolvedValue({
      filename: 'document.pdf',
      mime_type: 'application/pdf',
      size: mockPdfBuffer.length,
      content: 'Parsed PDF content',
      attachment_id: 'pdf-123',
    });
    
    mockDocxParser.parseDocxAttachment.mockResolvedValue({
      filename: 'document.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: mockDocxBuffer.length,
      content: 'Parsed DOCX content',
      attachment_id: 'docx-456',
    });
  });

  describe('detectSupportedAttachments', () => {
    it('should detect supported and unsupported attachments', () => {
      const attachments: AttachmentInfo[] = [
        mockPdfAttachment,
        mockDocxAttachment,
        {
          id: 'img-789',
          filename: 'image.jpg',
          mime_type: 'image/jpeg',
          size: 1000,
        },
        {
          id: 'txt-101',
          filename: 'text.txt',
          mime_type: 'text/plain',
          size: 500,
        },
      ];

      const result = attachmentProcessor.detectSupportedAttachments(attachments);

      expect(result.supported).toHaveLength(2);
      expect(result.supported[0].id).toBe('pdf-123');
      expect(result.supported[1].id).toBe('docx-456');
      expect(result.unsupported).toHaveLength(2);
      expect(result.unsupported[0].id).toBe('img-789');
      expect(result.unsupported[1].id).toBe('txt-101');
      expect(result.totalSize).toBe(mockPdfBuffer.length + mockDocxBuffer.length + 1000 + 500);
    });

    it('should handle empty attachment list', () => {
      const result = attachmentProcessor.detectSupportedAttachments([]);

      expect(result.supported).toHaveLength(0);
      expect(result.unsupported).toHaveLength(0);
      expect(result.totalSize).toBe(0);
    });
  });

  describe('isAttachmentSupported', () => {
    it('should return true for supported PDF files', () => {
      const result = attachmentProcessor.isAttachmentSupported(mockPdfAttachment);
      expect(result).toBe(true);
    });

    it('should return true for supported DOCX files', () => {
      const result = attachmentProcessor.isAttachmentSupported(mockDocxAttachment);
      expect(result).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      const unsupportedAttachment: AttachmentInfo = {
        id: 'img-123',
        filename: 'image.jpg',
        mime_type: 'image/jpeg',
        size: 1000,
      };

      const result = attachmentProcessor.isAttachmentSupported(unsupportedAttachment);
      expect(result).toBe(false);
    });

    it('should return false for files that are too large', () => {
      const largeAttachment: AttachmentInfo = {
        id: 'large-123',
        filename: 'large.pdf',
        mime_type: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
      };

      const result = attachmentProcessor.isAttachmentSupported(largeAttachment);
      expect(result).toBe(false);
    });

    it('should use mime-types lookup as fallback', () => {
      const { lookup } = require('mime-types');
      lookup.mockReturnValue('application/pdf');

      const attachmentWithoutMime: AttachmentInfo = {
        id: 'no-mime-123',
        filename: 'document.pdf',
        mime_type: 'application/octet-stream',
        size: 1000,
      };

      const result = attachmentProcessor.isAttachmentSupported(attachmentWithoutMime);
      
      expect(result).toBe(true);
      expect(lookup).toHaveBeenCalledWith('document.pdf');
    });
  });

  describe('processAttachment', () => {
    it('should process PDF attachment successfully', async () => {
      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mockPdfAttachment);

      expect(result.success).toBe(true);
      expect(result.parsedAttachment).toBeDefined();
      expect(result.parsedAttachment?.filename).toBe('document.pdf');
      expect(result.parsedAttachment?.content).toBe('Parsed PDF content');
      expect(mockPdfParser.parsePdfAttachment).toHaveBeenCalledWith(
        mockPdfBuffer,
        'document.pdf',
        'pdf-123'
      );
    });

    it('should process DOCX attachment successfully', async () => {
      const result = await attachmentProcessor.processAttachment(mockDocxBuffer, mockDocxAttachment);

      expect(result.success).toBe(true);
      expect(result.parsedAttachment).toBeDefined();
      expect(result.parsedAttachment?.filename).toBe('document.docx');
      expect(result.parsedAttachment?.content).toBe('Parsed DOCX content');
      expect(mockDocxParser.parseDocxAttachment).toHaveBeenCalledWith(
        mockDocxBuffer,
        'document.docx',
        'docx-456'
      );
    });

    it('should skip unsupported attachments', async () => {
      const unsupportedAttachment: AttachmentInfo = {
        id: 'img-123',
        filename: 'image.jpg',
        mime_type: 'image/jpeg',
        size: 1000,
      };

      const result = await attachmentProcessor.processAttachment(
        Buffer.from('image data'),
        unsupportedAttachment
      );

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Unsupported file type: image/jpeg');
      expect(result.parsedAttachment).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      mockPdfParser.validatePdf.mockReturnValue({
        isValid: false,
        errors: ['Invalid PDF header', 'File too small'],
      });

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mockPdfAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed: Invalid PDF header, File too small');
      expect(result.parsedAttachment).toBeUndefined();
    });

    it('should handle parsing errors', async () => {
      mockPdfParser.parsePdfAttachment.mockRejectedValue(new Error('PDF parsing failed'));

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mockPdfAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PDF parsing failed');
      expect(result.parsedAttachment).toBeUndefined();
    });

    it('should handle unknown file types', async () => {
      const unknownAttachment: AttachmentInfo = {
        id: 'unknown-123',
        filename: 'unknown.xyz',
        mime_type: 'application/xyz',
        size: 1000,
      };

      // Mock as supported but unknown type
      vi.spyOn(attachmentProcessor, 'isAttachmentSupported').mockReturnValue(true);

      const result = await attachmentProcessor.processAttachment(
        Buffer.from('unknown data'),
        unknownAttachment
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported attachment type: application/xyz');
    });

    it('should handle buffer size mismatch', async () => {
      const mismatchedAttachment: AttachmentInfo = {
        ...mockPdfAttachment,
        size: 999, // Different from buffer size
      };

      mockPdfParser.validatePdf.mockReturnValue({
        isValid: false,
        errors: ['Size mismatch: buffer 25 vs metadata 999'],
      });

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mismatchedAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Size mismatch');
    });
  });

  describe('processAttachments', () => {
    it('should process multiple attachments successfully', async () => {
      const attachmentData = [
        { buffer: mockPdfBuffer, info: mockPdfAttachment },
        { buffer: mockDocxBuffer, info: mockDocxAttachment },
      ];

      const result = await attachmentProcessor.processAttachments(attachmentData);

      expect(result.processed).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.stats.total).toBe(2);
      expect(result.stats.processed).toBe(2);
      expect(result.stats.errors).toBe(0);
      expect(result.stats.skipped).toBe(0);
    });

    it('should handle mixed results (processed, errors, skipped)', async () => {
      const unsupportedAttachment: AttachmentInfo = {
        id: 'img-123',
        filename: 'image.jpg',
        mime_type: 'image/jpeg',
        size: 1000,
      };

      const errorAttachment: AttachmentInfo = {
        id: 'error-123',
        filename: 'error.pdf',
        mime_type: 'application/pdf',
        size: 1000,
      };

      mockPdfParser.parsePdfAttachment.mockImplementation((buffer, filename) => {
        if (filename === 'error.pdf') {
          throw new Error('Parsing error');
        }
        return Promise.resolve({
          filename,
          mime_type: 'application/pdf',
          size: buffer.length,
          content: 'Content',
          attachment_id: 'pdf-123',
        });
      });

      const attachmentData = [
        { buffer: mockPdfBuffer, info: mockPdfAttachment },
        { buffer: Buffer.from('image'), info: unsupportedAttachment },
        { buffer: Buffer.from('error'), info: errorAttachment },
      ];

      const result = await attachmentProcessor.processAttachments(attachmentData);

      expect(result.processed).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.stats.total).toBe(3);
      expect(result.stats.processed).toBe(1);
      expect(result.stats.skipped).toBe(1);
      expect(result.stats.errors).toBe(1);
      
      expect(result.skipped[0].attachment.id).toBe('img-123');
      expect(result.errors[0].attachment.id).toBe('error-123');
    });

    it('should process attachments in batches', async () => {
      // Create 8 attachments to test batching (default batch size is 5)
      const attachmentData = Array.from({ length: 8 }, (_, i) => ({
        buffer: mockPdfBuffer,
        info: { ...mockPdfAttachment, id: `pdf-${i}` },
      }));

      const result = await attachmentProcessor.processAttachments(attachmentData);

      expect(result.processed).toHaveLength(8);
      expect(result.stats.total).toBe(8);
      expect(result.stats.processed).toBe(8);
    });

    it('should handle empty attachment data', async () => {
      const result = await attachmentProcessor.processAttachments([]);

      expect(result.processed).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate attachment buffer and metadata', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      const result = await attachmentProcessor.processAttachment(emptyBuffer, mockPdfAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should validate PDF-specific requirements', async () => {
      mockPdfParser.validatePdf.mockReturnValue({
        isValid: false,
        errors: ['Invalid PDF header'],
      });

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mockPdfAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF: Invalid PDF header');
    });

    it('should validate DOCX-specific requirements', async () => {
      mockDocxParser.validateDocx.mockReturnValue({
        isValid: false,
        errors: ['Not a ZIP archive'],
      });

      const result = await attachmentProcessor.processAttachment(mockDocxBuffer, mockDocxAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DOCX: Not a ZIP archive');
    });

    it('should check for missing filename', async () => {
      const attachmentWithoutFilename: AttachmentInfo = {
        ...mockPdfAttachment,
        filename: '',
      };

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, attachmentWithoutFilename);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing filename');
    });
  });

  describe('file type detection', () => {
    it('should detect PDF files by MIME type', async () => {
      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, mockPdfAttachment);
      
      expect(mockPdfParser.parsePdfAttachment).toHaveBeenCalled();
      expect(mockDocxParser.parseDocxAttachment).not.toHaveBeenCalled();
    });

    it('should detect PDF files by extension', async () => {
      const pdfByExtension: AttachmentInfo = {
        ...mockPdfAttachment,
        mime_type: 'application/octet-stream',
      };

      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, pdfByExtension);
      
      expect(mockPdfParser.parsePdfAttachment).toHaveBeenCalled();
    });

    it('should detect DOCX files by MIME type', async () => {
      const result = await attachmentProcessor.processAttachment(mockDocxBuffer, mockDocxAttachment);
      
      expect(mockDocxParser.parseDocxAttachment).toHaveBeenCalled();
      expect(mockPdfParser.parsePdfAttachment).not.toHaveBeenCalled();
    });

    it('should detect DOCX files by extension', async () => {
      const docxByExtension: AttachmentInfo = {
        ...mockDocxAttachment,
        mime_type: 'application/octet-stream',
      };

      const result = await attachmentProcessor.processAttachment(mockDocxBuffer, docxByExtension);
      
      expect(mockDocxParser.parseDocxAttachment).toHaveBeenCalled();
    });

    it('should handle various DOCX extensions and MIME types', async () => {
      const docxVariants = [
        { filename: 'template.dotx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.template' },
        { filename: 'macro.docm', mime_type: 'application/vnd.ms-word.document.macroenabled.12' },
        { filename: 'template.dotm', mime_type: 'application/vnd.ms-word.template.macroenabled.12' },
      ];

      for (const variant of docxVariants) {
        const attachment: AttachmentInfo = {
          ...mockDocxAttachment,
          filename: variant.filename,
          mime_type: variant.mime_type,
        };

        vi.clearAllMocks();
        await attachmentProcessor.processAttachment(mockDocxBuffer, attachment);
        
        expect(mockDocxParser.parseDocxAttachment).toHaveBeenCalled();
      }
    });
  });

  describe('configuration and limits', () => {
    it('should return processing statistics', () => {
      const stats = attachmentProcessor.getProcessingStats();

      expect(stats.supportedTypes).toContain('application/pdf');
      expect(stats.supportedTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(stats.maxFileSize).toBe(10 * 1024 * 1024);
      expect(stats.maxConcurrentProcessing).toBe(5);
    });

    it('should update processing limits', () => {
      attachmentProcessor.updateLimits({
        maxFileSize: 5 * 1024 * 1024,
        maxConcurrentProcessing: 3,
      });

      const stats = attachmentProcessor.getProcessingStats();
      expect(stats.maxFileSize).toBe(5 * 1024 * 1024);
      expect(stats.maxConcurrentProcessing).toBe(3);
    });

    it('should enforce minimum and maximum limits', () => {
      attachmentProcessor.updateLimits({
        maxFileSize: 100, // Too small
        maxConcurrentProcessing: 20, // Too large
      });

      const stats = attachmentProcessor.getProcessingStats();
      expect(stats.maxFileSize).toBe(1024); // Minimum enforced
      expect(stats.maxConcurrentProcessing).toBe(10); // Maximum enforced
    });

    it('should handle partial limit updates', () => {
      const originalStats = attachmentProcessor.getProcessingStats();
      
      attachmentProcessor.updateLimits({
        maxFileSize: 2 * 1024 * 1024,
      });

      const newStats = attachmentProcessor.getProcessingStats();
      expect(newStats.maxFileSize).toBe(2 * 1024 * 1024);
      expect(newStats.maxConcurrentProcessing).toBe(originalStats.maxConcurrentProcessing);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null/undefined buffer', async () => {
      // @ts-expect-error - Testing runtime behavior
      const result = await attachmentProcessor.processAttachment(null, mockPdfAttachment);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should handle attachment info without required fields', async () => {
      const invalidAttachment = {
        id: 'invalid',
        // Missing required fields
      } as AttachmentInfo;

      // @ts-expect-error - Testing runtime behavior
      const result = await attachmentProcessor.processAttachment(mockPdfBuffer, invalidAttachment);

      expect(result.success).toBe(false);
    });

    it('should handle concurrent processing errors gracefully', async () => {
      // Mock one parser to fail randomly
      mockPdfParser.parsePdfAttachment.mockImplementation(() => {
        if (Math.random() > 0.5) {
          throw new Error('Random parsing error');
        }
        return Promise.resolve({
          filename: 'test.pdf',
          mime_type: 'application/pdf',
          size: 100,
          content: 'Content',
          attachment_id: 'test',
        });
      });

      const attachmentData = Array.from({ length: 10 }, (_, i) => ({
        buffer: mockPdfBuffer,
        info: { ...mockPdfAttachment, id: `pdf-${i}` },
      }));

      const result = await attachmentProcessor.processAttachments(attachmentData);

      expect(result.stats.total).toBe(10);
      expect(result.stats.processed + result.stats.errors).toBe(10);
    });
  });
});
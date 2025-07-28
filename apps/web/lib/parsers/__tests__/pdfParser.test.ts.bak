import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdfParser } from '../pdfParser';

// Mock pdf-parse
const mockPdfParse = vi.fn();
vi.mock('pdf-parse', () => ({
  default: mockPdfParse,
}));

describe('PdfParser', () => {
  let pdfParser: PdfParser;
  let mockPdfBuffer: Buffer;

  beforeEach(() => {
    vi.clearAllMocks();
    pdfParser = new PdfParser();
    
    // Create a mock PDF buffer with PDF header
    mockPdfBuffer = Buffer.from('%PDF-1.4\nMock PDF content');
  });

  describe('parsePdf', () => {
    it('should parse PDF successfully', async () => {
      const mockPdfData = {
        text: 'This is extracted PDF text content with multiple words.',
        numpages: 2,
        info: {
          Title: 'Test Document',
          Author: 'John Doe',
          Subject: 'Testing',
          Creator: 'Test Creator',
          Producer: 'Test Producer',
          CreationDate: '2024-01-01T00:00:00Z',
          ModDate: '2024-01-02T00:00:00Z',
        },
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toBe('This is extracted PDF text content with multiple words.');
      expect(result.pages).toBe(2);
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.metadata.subject).toBe('Testing');
      expect(result.metadata.creator).toBe('Test Creator');
      expect(result.metadata.producer).toBe('Test Producer');
      expect(result.metadata.creationDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.modDate).toBe('2024-01-02T00:00:00.000Z');
      expect(result.info.fileSize).toBe(mockPdfBuffer.length);
      expect(result.info.wordCount).toBe(10);
      expect(result.info.isScanned).toBe(false);
    });

    it('should reject files that are too large', async () => {
      const largePdfBuffer = Buffer.alloc(11 * 1024 * 1024, '%PDF-1.4'); // 11MB

      const result = await pdfParser.parsePdf(largePdfBuffer, 'large.pdf');

      expect(result.text).toContain('[Error parsing PDF: large.pdf]');
      expect(result.pages).toBe(0);
      expect(result.info.wordCount).toBe(0);
    });

    it('should clean PDF text properly', async () => {
      const mockPdfData = {
        text: 'Line 1\r\nLine 2\rLine 3\f\nBro-\nken word\nAnother\nword',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toContain('Line 1\nLine 2\nLine 3\n');
      expect(result.text).toContain('Broken word'); // Hyphenation fixed
      expect(result.text).toContain('Another word'); // Word joining fixed
    });

    it('should detect scanned PDFs', async () => {
      const mockPdfData = {
        text: 'abc', // Very little text for 10 pages
        numpages: 10,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'scanned.pdf');

      expect(result.info.isScanned).toBe(true);
    });

    it('should handle PDFs with no text content', async () => {
      const mockPdfData = {
        text: '',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'empty.pdf');

      expect(result.text).toBe('');
      expect(result.info.wordCount).toBe(0);
      expect(result.info.isScanned).toBe(true); // Empty text suggests scanned
    });

    it('should handle parsing errors gracefully', async () => {
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'broken.pdf');

      expect(result.text).toBe('[Error parsing PDF: broken.pdf]');
      expect(result.pages).toBe(0);
      expect(result.info.fileSize).toBe(mockPdfBuffer.length);
      expect(result.info.wordCount).toBe(0);
      expect(result.info.isScanned).toBe(false);
    });

    it('should handle metadata extraction errors', async () => {
      const mockPdfData = {
        text: 'PDF content',
        numpages: 1,
        info: {
          Title: null,
          Author: undefined,
          CreationDate: 'invalid-date',
          ModDate: null,
        },
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toBe('PDF content');
      expect(result.metadata.title).toBeUndefined();
      expect(result.metadata.author).toBeUndefined();
      expect(result.metadata.creationDate).toBeUndefined(); // Invalid date ignored
      expect(result.metadata.modDate).toBeUndefined();
    });

    it('should limit processing to max pages', async () => {
      mockPdfParse.mockImplementation((buffer, options) => {
        expect(options.max).toBe(100); // Default max pages
        return Promise.resolve({
          text: 'Limited processing',
          numpages: 50,
          info: {},
        });
      });

      await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(mockPdfParse).toHaveBeenCalledWith(
        mockPdfBuffer,
        expect.objectContaining({ max: 100 })
      );
    });
  });

  describe('parsePdfAttachment', () => {
    it('should parse PDF attachment and return ParsedAttachment', async () => {
      const mockPdfData = {
        text: 'Attachment content',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdfAttachment(
        mockPdfBuffer,
        'document.pdf',
        'attachment-123'
      );

      expect(result.filename).toBe('document.pdf');
      expect(result.mime_type).toBe('application/pdf');
      expect(result.size).toBe(mockPdfBuffer.length);
      expect(result.content).toBe('Attachment content');
      expect(result.attachment_id).toBe('attachment-123');
    });
  });

  describe('validatePdf', () => {
    it('should validate correct PDF files', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nValid PDF content');

      const result = pdfParser.validatePdf(validPdfBuffer, 'test.pdf');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty files', () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = pdfParser.validatePdf(emptyBuffer, 'empty.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty file');
    });

    it('should reject files that are too large', () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, '%PDF-1.4');

      const result = pdfParser.validatePdf(largeBuffer, 'large.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('File too large')
      );
    });

    it('should reject files without PDF header', () => {
      const invalidBuffer = Buffer.from('Not a PDF file');

      const result = pdfParser.validatePdf(invalidBuffer, 'fake.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid PDF header');
    });

    it('should reject files without .pdf extension', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nContent');

      const result = pdfParser.validatePdf(validPdfBuffer, 'document.txt');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not have .pdf extension');
    });

    it('should reject files that are too small', () => {
      const tinyBuffer = Buffer.from('ab'); // Less than 4 bytes

      const result = pdfParser.validatePdf(tinyBuffer, 'tiny.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File too small to be a valid PDF');
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return correct MIME types', () => {
      const mimeTypes = pdfParser.getSupportedMimeTypes();

      expect(mimeTypes).toEqual(['application/pdf']);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported MIME type', () => {
      const result = pdfParser.isSupported('application/pdf', 'test.pdf');
      expect(result).toBe(true);
    });

    it('should return true for PDF extension even with wrong MIME type', () => {
      const result = pdfParser.isSupported('application/octet-stream', 'test.pdf');
      expect(result).toBe(true);
    });

    it('should return false for unsupported types', () => {
      const result = pdfParser.isSupported('text/plain', 'test.txt');
      expect(result).toBe(false);
    });

    it('should handle case-insensitive checks', () => {
      const result1 = pdfParser.isSupported('APPLICATION/PDF', 'TEST.PDF');
      const result2 = pdfParser.isSupported('text/plain', 'document.PDF');

      expect(result1).toBe(true);
      expect(result2).toBe(true); // Extension check should work
    });
  });

  describe('text cleaning', () => {
    it('should normalize line endings', async () => {
      const mockPdfData = {
        text: 'Line 1\r\nLine 2\rLine 3\nLine 4',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toContain('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should fix hyphenated words at line breaks', async () => {
      const mockPdfData = {
        text: 'This is a hyphen-\nated word and another\nword.',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toContain('hyphenated word');
      expect(result.text).toContain('another word');
    });

    it('should clean up multiple spaces and tabs', async () => {
      const mockPdfData = {
        text: 'Text   with\t\tmultiple\t   spaces',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toBe('Text with multiple spaces');
    });

    it('should limit consecutive line breaks', async () => {
      const mockPdfData = {
        text: 'Paragraph 1\n\n\n\n\nParagraph 2',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should add paragraph breaks after sentences', async () => {
      const mockPdfData = {
        text: 'Sentence one.\nSentence two.',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toBe('Sentence one.\n\nSentence two.');
    });

    it('should fix concatenated words', async () => {
      const mockPdfData = {
        text: 'WordsStuckTogether SomeMoreWords',
        numpages: 1,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.text).toContain('Words Stuck Together');
      expect(result.text).toContain('Some More Words');
    });
  });

  describe('metadata extraction', () => {
    it('should handle various metadata field types', async () => {
      const mockPdfData = {
        text: 'Content',
        numpages: 1,
        info: {
          Title: 'String Title',
          Author: 123, // Number that should be converted to string
          Subject: '', // Empty string
          Creator: null, // Null value
          Producer: undefined, // Undefined value
        },
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.metadata.title).toBe('String Title');
      expect(result.metadata.author).toBe('123');
      expect(result.metadata.subject).toBe('');
      expect(result.metadata.creator).toBeUndefined();
      expect(result.metadata.producer).toBeUndefined();
    });

    it('should handle valid date formats', async () => {
      const mockPdfData = {
        text: 'Content',
        numpages: 1,
        info: {
          CreationDate: new Date('2024-01-01'),
          ModDate: '2024-01-02T10:00:00Z',
        },
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.metadata.creationDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.modDate).toBe('2024-01-02T10:00:00.000Z');
    });

    it('should ignore invalid date formats', async () => {
      const mockPdfData = {
        text: 'Content',
        numpages: 1,
        info: {
          CreationDate: 'invalid-date',
          ModDate: 'D:20240101120000Z', // PDF date format (not standard JS)
        },
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'test.pdf');

      expect(result.metadata.creationDate).toBeUndefined();
      expect(result.metadata.modDate).toBeUndefined();
    });
  });

  describe('scanned PDF detection', () => {
    it('should detect scanned PDFs with low text density', async () => {
      const mockPdfData = {
        text: 'Few words', // 2 words for 5 pages = 40 chars per page (< 100)
        numpages: 5,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'scanned.pdf');

      expect(result.info.isScanned).toBe(true);
    });

    it('should not detect text-heavy PDFs as scanned', async () => {
      const longText = 'This is a long text '.repeat(20); // Plenty of text
      const mockPdfData = {
        text: longText,
        numpages: 2,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'text-heavy.pdf');

      expect(result.info.isScanned).toBe(false);
    });

    it('should handle zero pages gracefully', async () => {
      const mockPdfData = {
        text: 'Some text',
        numpages: 0,
        info: {},
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await pdfParser.parsePdf(mockPdfBuffer, 'empty.pdf');

      expect(result.info.isScanned).toBe(false);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocxParser } from '../docxParser';

// Mock mammoth
const mockMammoth = {
  extractRawText: vi.fn(),
  convertToHtml: vi.fn(),
  images: {
    imgElement: vi.fn(),
  },
};

vi.mock('mammoth', () => ({
  default: mockMammoth,
}));

// Mock cheerio for structured content extraction
const mockCheerio = {
  load: vi.fn(),
};

vi.mock('cheerio', () => mockCheerio);

describe('DocxParser', () => {
  let docxParser: DocxParser;
  let mockDocxBuffer: Buffer;

  beforeEach(() => {
    vi.clearAllMocks();
    docxParser = new DocxParser();
    
    // Create a mock DOCX buffer with ZIP signature
    mockDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, ...Buffer.from('Mock DOCX content')]);
    
    // Setup default mammoth mocks
    mockMammoth.extractRawText.mockResolvedValue({
      value: 'Extracted text content',
      messages: [],
    });
    
    mockMammoth.convertToHtml.mockResolvedValue({
      value: '<p>HTML content</p>',
      messages: [],
    });

    mockMammoth.images.imgElement.mockReturnValue({
      src: '[IMAGE: embedded image]',
    });
  });

  describe('parseDocx', () => {
    it('should parse DOCX successfully', async () => {
      const mockTextResult = {
        value: 'This is extracted DOCX text with multiple words for testing.',
        messages: [{ message: 'Text extraction message' }],
      };
      
      const mockHtmlResult = {
        value: '<p>This is <strong>HTML</strong> content with <a href="http://example.com">links</a></p><table><tr><td>cell</td></tr></table>',
        messages: [{ message: 'HTML conversion message' }],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue(mockHtmlResult);

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('This is extracted DOCX text with multiple words for testing.');
      expect(result.html).toBe(mockHtmlResult.value);
      expect(result.metadata.wordCount).toBe(11);
      expect(result.metadata.hasHyperlinks).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
      expect(result.messages).toContain('Text: Text extraction message');
      expect(result.messages).toContain('HTML: HTML conversion message');
      expect(result.info.fileSize).toBe(mockDocxBuffer.length);
      expect(result.info.characterCount).toBe(mockTextResult.value.length);
    });

    it('should reject files that are too large', async () => {
      const largeDocxBuffer = Buffer.alloc(6 * 1024 * 1024, 0x50); // 6MB

      const result = await docxParser.parseDocx(largeDocxBuffer, 'large.docx');

      expect(result.text).toContain('[Error parsing DOCX: large.docx]');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.info.fileSize).toBe(largeDocxBuffer.length);
    });

    it('should clean DOCX text properly', async () => {
      const mockTextResult = {
        value: 'Text with\r\ncarriage returns\rand\ttabs\u00A0non-breaking\u2013spaces\u2018smart quotes\u2019',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toContain('Text with\ncarriage returns\nand    tabs non-breaking-spaces\'smart quotes\'');
    });

    it('should analyze content metadata correctly', async () => {
      const mockHtmlResult = {
        value: `
          <p>Content with <img src="image.jpg" alt="test"> image</p>
          <p>Link to <a href="https://example.com">website</a></p>
          <p><!-- This is a comment --></p>
          <table><tr><td>Table content</td></tr></table>
        `,
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue({ value: 'Text content', messages: [] });
      mockMammoth.convertToHtml.mockResolvedValue(mockHtmlResult);

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasHyperlinks).toBe(true);
      expect(result.metadata.hasComments).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should handle parsing errors gracefully', async () => {
      mockMammoth.extractRawText.mockRejectedValue(new Error('DOCX parsing failed'));

      const result = await docxParser.parseDocx(mockDocxBuffer, 'broken.docx');

      expect(result.text).toBe('[Error parsing DOCX: broken.docx]');
      expect(result.html).toBe('');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.messages).toContain('Error: DOCX parsing failed');
    });

    it('should handle empty DOCX content', async () => {
      mockMammoth.extractRawText.mockResolvedValue({ value: '', messages: [] });
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'empty.docx');

      expect(result.text).toBe('');
      expect(result.metadata.wordCount).toBe(0);
      expect(result.info.characterCount).toBe(0);
      expect(result.info.paragraphCount).toBe(1); // Empty content creates one paragraph
    });

    it('should configure mammoth with custom image handler', async () => {
      await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith(
        mockDocxBuffer,
        expect.objectContaining({
          convertImage: expect.any(Function),
          includeDefaultStyleMap: true,
          includeEmbeddedStyleMap: true,
        })
      );
    });

    it('should count paragraphs correctly', async () => {
      const textWithParagraphs = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      mockMammoth.extractRawText.mockResolvedValue({ value: textWithParagraphs, messages: [] });
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.info.paragraphCount).toBe(3);
    });
  });

  describe('parseDocxAttachment', () => {
    it('should parse DOCX attachment and return ParsedAttachment', async () => {
      mockMammoth.extractRawText.mockResolvedValue({ value: 'Attachment content', messages: [] });
      mockMammoth.convertToHtml.mockResolvedValue({ value: '<p>HTML</p>', messages: [] });

      const result = await docxParser.parseDocxAttachment(
        mockDocxBuffer,
        'document.docx',
        'attachment-123'
      );

      expect(result.filename).toBe('document.docx');
      expect(result.mime_type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(result.size).toBe(mockDocxBuffer.length);
      expect(result.content).toBe('Attachment content');
      expect(result.attachment_id).toBe('attachment-123');
    });
  });

  describe('extractStructuredContent', () => {
    it('should extract structured content from DOCX HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Main Title</h1>
            <h2>Subtitle</h2>
            <p>This is a substantial paragraph with more than ten characters.</p>
            <p>Short</p>
            <ul>
              <li>List item 1</li>
              <li>List item 2</li>
            </ul>
            <ol>
              <li>Numbered item 1</li>
              <li>Numbered item 2</li>
            </ol>
            <table>
              <tr>
                <th>Header 1</th>
                <th>Header 2</th>
              </tr>
              <tr>
                <td>Cell 1</td>
                <td>Cell 2</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      mockMammoth.convertToHtml.mockResolvedValue({ value: mockHtml, messages: [] });

      // Mock cheerio
      const mockElements = {
        headings: [
          { text: () => 'Main Title' },
          { text: () => 'Subtitle' },
        ],
        paragraphs: [
          { text: () => 'This is a substantial paragraph with more than ten characters.' },
          { text: () => 'Short' }, // Will be filtered out
        ],
        lists: [
          {
            find: vi.fn().mockReturnValue({
              each: vi.fn().mockImplementation((callback) => {
                callback(0, { text: () => 'List item 1' });
                callback(1, { text: () => 'List item 2' });
              }),
            }),
          },
          {
            find: vi.fn().mockReturnValue({
              each: vi.fn().mockImplementation((callback) => {
                callback(0, { text: () => 'Numbered item 1' });
                callback(1, { text: () => 'Numbered item 2' });
              }),
            }),
          },
        ],
        tables: [
          {
            find: vi.fn().mockReturnValue({
              each: vi.fn().mockImplementation((callback) => {
                callback(0, {
                  find: vi.fn().mockReturnValue({
                    each: vi.fn().mockImplementation((cellCallback) => {
                      cellCallback(0, { text: () => 'Header 1' });
                      cellCallback(1, { text: () => 'Header 2' });
                    }),
                  }),
                });
                callback(1, {
                  find: vi.fn().mockReturnValue({
                    each: vi.fn().mockImplementation((cellCallback) => {
                      cellCallback(0, { text: () => 'Cell 1' });
                      cellCallback(1, { text: () => 'Cell 2' });
                    }),
                  }),
                });
              }),
            }),
          },
        ],
      };

      const mockCheerioInstance = {
        find: vi.fn(),
      };

      mockCheerioInstance.find.mockImplementation((selector) => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return {
            each: vi.fn().mockImplementation((callback) => {
              mockElements.headings.forEach((el, i) => callback(i, el));
            }),
          };
        }
        if (selector === 'p') {
          return {
            each: vi.fn().mockImplementation((callback) => {
              mockElements.paragraphs.forEach((el, i) => callback(i, el));
            }),
          };
        }
        if (selector === 'ul, ol') {
          return {
            each: vi.fn().mockImplementation((callback) => {
              mockElements.lists.forEach((el, i) => callback(i, el));
            }),
          };
        }
        if (selector === 'table') {
          return {
            each: vi.fn().mockImplementation((callback) => {
              mockElements.tables.forEach((el, i) => callback(i, el));
            }),
          };
        }
        return { each: vi.fn() };
      });

      mockCheerio.load.mockReturnValue(mockCheerioInstance);

      const result = await docxParser.extractStructuredContent(mockDocxBuffer);

      expect(result.headings).toEqual(['Main Title', 'Subtitle']);
      expect(result.paragraphs).toEqual(['This is a substantial paragraph with more than ten characters.']);
      expect(result.lists).toEqual([
        'List item 1\nList item 2',
        'Numbered item 1\nNumbered item 2',
      ]);
      expect(result.tables).toEqual([
        [['Header 1', 'Header 2'], ['Cell 1', 'Cell 2']],
      ]);
    });

    it('should handle extraction errors gracefully', async () => {
      mockMammoth.convertToHtml.mockRejectedValue(new Error('HTML conversion failed'));

      const result = await docxParser.extractStructuredContent(mockDocxBuffer);

      expect(result.headings).toEqual([]);
      expect(result.paragraphs).toEqual([]);
      expect(result.lists).toEqual([]);
      expect(result.tables).toEqual([]);
    });
  });

  describe('validateDocx', () => {
    it('should validate correct DOCX files', () => {
      const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, ...Buffer.from('DOCX content')]);

      const result = docxParser.validateDocx(validDocxBuffer, 'test.docx');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty files', () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = docxParser.validateDocx(emptyBuffer, 'empty.docx');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty file');
    });

    it('should reject files that are too large', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0x50);

      const result = docxParser.validateDocx(largeBuffer, 'large.docx');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('File too large'));
    });

    it('should reject files without ZIP signature', () => {
      const invalidBuffer = Buffer.from('Not a ZIP file');

      const result = docxParser.validateDocx(invalidBuffer, 'fake.docx');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid DOCX file signature (not a ZIP archive)');
    });

    it('should accept alternative ZIP signatures', () => {
      const zipSig1 = Buffer.from([0x50, 0x4B, 0x05, 0x06]);
      const zipSig2 = Buffer.from([0x50, 0x4B, 0x07, 0x08]);

      const result1 = docxParser.validateDocx(zipSig1, 'test.docx');
      const result2 = docxParser.validateDocx(zipSig2, 'test.docx');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should reject files without valid DOCX extension', () => {
      const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);

      const result = docxParser.validateDocx(validDocxBuffer, 'document.pdf');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not have a valid DOCX extension');
    });

    it('should accept various DOCX extensions', () => {
      const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
      
      const extensions = ['test.docx', 'template.dotx', 'macro.docm', 'template.dotm'];
      
      extensions.forEach(filename => {
        const result = docxParser.validateDocx(validDocxBuffer, filename);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject files that are too small', () => {
      const tinyBuffer = Buffer.from([0x50]); // Less than 4 bytes

      const result = docxParser.validateDocx(tinyBuffer, 'tiny.docx');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File too small to be a valid DOCX');
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return correct MIME types', () => {
      const mimeTypes = docxParser.getSupportedMimeTypes();

      expect(mimeTypes).toEqual([
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        'application/vnd.ms-word.document.macroEnabled.12',
        'application/vnd.ms-word.template.macroEnabled.12',
      ]);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported MIME types', () => {
      const supportedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        'application/vnd.ms-word.document.macroEnabled.12',
        'application/vnd.ms-word.template.macroEnabled.12',
      ];

      supportedTypes.forEach(mimeType => {
        const result = docxParser.isSupported(mimeType, 'test.docx');
        expect(result).toBe(true);
      });
    });

    it('should return true for supported extensions even with wrong MIME type', () => {
      const extensions = ['.docx', '.dotx', '.docm', '.dotm'];
      
      extensions.forEach(ext => {
        const result = docxParser.isSupported('application/octet-stream', `test${ext}`);
        expect(result).toBe(true);
      });
    });

    it('should return false for unsupported types', () => {
      const result = docxParser.isSupported('application/pdf', 'test.pdf');
      expect(result).toBe(false);
    });

    it('should handle case-insensitive checks', () => {
      const result1 = docxParser.isSupported(
        'APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT',
        'TEST.DOCX'
      );
      const result2 = docxParser.isSupported('text/plain', 'document.DOCX');

      expect(result1).toBe(true);
      expect(result2).toBe(true); // Extension check should work
    });

    it('should handle partial MIME type matches', () => {
      const result = docxParser.isSupported(
        'application/vnd.openxmlformats-officedocument.wordprocessingml',
        'test.docx'
      );
      expect(result).toBe(true);
    });
  });

  describe('text cleaning', () => {
    it('should normalize line endings', async () => {
      const mockTextResult = {
        value: 'Line 1\r\nLine 2\rLine 3\nLine 4',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should convert tabs to spaces', async () => {
      const mockTextResult = {
        value: 'Text\twith\ttabs',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('Text    with    tabs');
    });

    it('should clean up multiple spaces', async () => {
      const mockTextResult = {
        value: 'Text   with    multiple     spaces',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('Text with multiple spaces');
    });

    it('should limit consecutive line breaks', async () => {
      const mockTextResult = {
        value: 'Paragraph 1\n\n\n\n\nParagraph 2',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('Paragraph 1\n\nParagraph 2');
    });

    it('should clean up Word-specific characters', async () => {
      const mockTextResult = {
        value: 'Text\u00A0with\u2013special\u2014chars\u2018quotes\u2019and\u201Cmore\u201Dquotes\u2026',
        messages: [],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue({ value: '', messages: [] });

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.text).toBe('Text with-special--chars\'quotes\'and"more"quotes...');
    });
  });

  describe('error handling', () => {
    it('should handle unknown errors gracefully', async () => {
      mockMammoth.extractRawText.mockRejectedValue('String error');

      const result = await docxParser.parseDocx(mockDocxBuffer, 'error.docx');

      expect(result.text).toBe('[Error parsing DOCX: error.docx]');
      expect(result.messages).toContain('Error: Unknown error');
    });

    it('should handle mammoth messages correctly', async () => {
      const mockTextResult = {
        value: 'Content',
        messages: [
          { message: 'Warning: unsupported style' },
          { message: 'Info: processed successfully' },
        ],
      };

      const mockHtmlResult = {
        value: '<p>Content</p>',
        messages: [
          { message: 'Warning: image not found' },
        ],
      };

      mockMammoth.extractRawText.mockResolvedValue(mockTextResult);
      mockMammoth.convertToHtml.mockResolvedValue(mockHtmlResult);

      const result = await docxParser.parseDocx(mockDocxBuffer, 'test.docx');

      expect(result.messages).toContain('Text: Warning: unsupported style');
      expect(result.messages).toContain('Text: Info: processed successfully');
      expect(result.messages).toContain('HTML: Warning: image not found');
    });
  });
});
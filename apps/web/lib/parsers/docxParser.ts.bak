import mammoth from 'mammoth';
import { ParsedAttachment } from '@jessie/lib';

export interface DocxParseResult {
  text: string;
  html: string;
  metadata: {
    wordCount: number;
    hasImages: boolean;
    hasHyperlinks: boolean;
    hasComments: boolean;
    hasTables: boolean;
  };
  messages: string[]; // Warning/info messages from mammoth
  info: {
    fileSize: number;
    characterCount: number;
    paragraphCount: number;
  };
}

export class DocxParser {
  private maxFileSize = 5 * 1024 * 1024; // 5MB limit for DOCX files

  /**
   * Parse DOCX buffer and extract text content
   */
  async parseDocx(buffer: Buffer, filename: string): Promise<DocxParseResult> {
    try {
      // Check file size
      if (buffer.length > this.maxFileSize) {
        throw new Error(`DOCX file too large: ${buffer.length} bytes (max: ${this.maxFileSize})`);
      }

      // Configure mammoth options
      const options = {
        convertImage: mammoth.images.imgElement((image: any) => {
          // Convert images to placeholder text
          return { src: `[IMAGE: ${image.altText || 'embedded image'}]` };
        }),
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true,
      };

      // Extract text
      const textResult = await mammoth.extractRawText(buffer, options);
      
      // Extract HTML (for better formatting preservation)
      const htmlResult = await mammoth.convertToHtml(buffer, options);

      // Clean and process text
      const cleanText = this.cleanDocxText(textResult.value);
      
      // Analyze content
      const metadata = this.analyzeContent(cleanText, htmlResult.value);
      
      // Combine messages from both operations
      const messages = [
        ...textResult.messages.map(m => `Text: ${m.message}`),
        ...htmlResult.messages.map(m => `HTML: ${m.message}`)
      ];

      // Calculate info
      const info = {
        fileSize: buffer.length,
        characterCount: cleanText.length,
        paragraphCount: cleanText.split('\n\n').length,
      };

      return {
        text: cleanText,
        html: htmlResult.value,
        metadata,
        messages,
        info,
      };

    } catch (error) {
      console.error('Error parsing DOCX:', error);
      
      // Return empty result with error info
      return {
        text: `[Error parsing DOCX: ${filename}]`,
        html: '',
        metadata: {
          wordCount: 0,
          hasImages: false,
          hasHyperlinks: false,
          hasComments: false,
          hasTables: false,
        },
        messages: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        info: {
          fileSize: buffer.length,
          characterCount: 0,
          paragraphCount: 0,
        },
      };
    }
  }

  /**
   * Parse DOCX attachment from email
   */
  async parseDocxAttachment(
    buffer: Buffer, 
    filename: string, 
    attachmentId: string
  ): Promise<ParsedAttachment> {
    const parseResult = await this.parseDocx(buffer, filename);
    
    return {
      filename,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: buffer.length,
      content: parseResult.text,
      attachment_id: attachmentId,
    };
  }

  /**
   * Clean and normalize extracted DOCX text
   */
  private cleanDocxText(text: string): string {
    if (!text || text.trim() === '') {
      return '';
    }

    return text
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      
      // Clean up spacing
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/[ ]+/g, ' ') // Multiple spaces to single space
      .replace(/\n[ ]+/g, '\n') // Remove leading spaces on lines
      .replace(/[ ]+\n/g, '\n') // Remove trailing spaces on lines
      
      // Fix paragraph breaks
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      
      // Clean up common Word artifacts
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .replace(/\u2013/g, '-') // Replace en dash
      .replace(/\u2014/g, '--') // Replace em dash
      .replace(/\u2018|\u2019/g, "'") // Replace smart quotes
      .replace(/\u201C|\u201D/g, '"') // Replace smart quotes
      .replace(/\u2026/g, '...') // Replace ellipsis
      
      .trim();
  }

  /**
   * Analyze DOCX content for metadata
   */
  private analyzeContent(text: string, html: string): DocxParseResult['metadata'] {
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Analyze HTML for more detailed information
    const hasImages = html.includes('<img') || html.includes('[IMAGE:');
    const hasHyperlinks = html.includes('<a href') || html.includes('http://') || html.includes('https://');
    const hasComments = html.includes('comment') || html.includes('<!-- ');
    const hasTables = html.includes('<table') || html.includes('<tr') || html.includes('<td');

    return {
      wordCount,
      hasImages,
      hasHyperlinks,
      hasComments,
      hasTables,
    };
  }

  /**
   * Extract structured content from DOCX
   */
  async extractStructuredContent(buffer: Buffer): Promise<{
    headings: string[];
    paragraphs: string[];
    lists: string[];
    tables: string[][];
  }> {
    try {
      const htmlResult = await mammoth.convertToHtml(buffer);
      const html = htmlResult.value;

      // Use cheerio to parse HTML and extract structured content  
      const { load } = await import('cheerio');
      const $ = load(html);

      // Extract headings
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_: any, element: any) => {
        const text = $(element).text().trim();
        if (text) headings.push(text);
      });

      // Extract paragraphs
      const paragraphs: string[] = [];
      $('p').each((_: any, element: any) => {
        const text = $(element).text().trim();
        if (text && text.length > 10) { // Filter out very short paragraphs
          paragraphs.push(text);
        }
      });

      // Extract lists
      const lists: string[] = [];
      $('ul, ol').each((_: any, element: any) => {
        const items: string[] = [];
        $(element).find('li').each((_: any, li: any) => {
          const text = $(li).text().trim();
          if (text) items.push(text);
        });
        if (items.length > 0) {
          lists.push(items.join('\n'));
        }
      });

      // Extract tables
      const tables: string[][] = [];
      $('table').each((_: any, element: any) => {
        const tableData: string[][] = [];
        $(element).find('tr').each((_: any, row: any) => {
          const rowData: string[] = [];
          $(row).find('td, th').each((_: any, cell: any) => {
            const text = $(cell).text().trim();
            rowData.push(text);
          });
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        });
        if (tableData.length > 0) {
          tables.push(tableData);
        }
      });

      return {
        headings,
        paragraphs,
        lists,
        tables,
      };

    } catch (error) {
      console.error('Error extracting structured content:', error);
      return {
        headings: [],
        paragraphs: [],
        lists: [],
        tables: [],
      };
    }
  }

  /**
   * Validate DOCX buffer
   */
  validateDocx(buffer: Buffer, filename: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (buffer.length === 0) {
      errors.push('Empty file');
    }

    if (buffer.length > this.maxFileSize) {
      errors.push(`File too large: ${buffer.length} bytes (max: ${this.maxFileSize})`);
    }

    // Check for ZIP signature (DOCX files are ZIP archives)
    if (buffer.length >= 4) {
      const signature = buffer.toString('hex', 0, 4);
      if (signature !== '504b0304' && signature !== '504b0506' && signature !== '504b0708') {
        errors.push('Invalid DOCX file signature (not a ZIP archive)');
      }
    } else {
      errors.push('File too small to be a valid DOCX');
    }

    // Check filename extension
    const validExtensions = ['.docx', '.dotx', '.docm', '.dotm'];
    const hasValidExtension = validExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      errors.push('File does not have a valid DOCX extension');
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
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template', // .dotx
      'application/vnd.ms-word.document.macroEnabled.12', // .docm
      'application/vnd.ms-word.template.macroEnabled.12', // .dotm
    ];
  }

  /**
   * Check if file is supported
   */
  isSupported(mimeType: string, filename: string): boolean {
    const supportedTypes = this.getSupportedMimeTypes();
    const hasValidMimeType = supportedTypes.some(type => 
      mimeType.toLowerCase().includes(type) || type.includes(mimeType.toLowerCase())
    );
    
    const validExtensions = ['.docx', '.dotx', '.docm', '.dotm'];
    const hasValidExtension = validExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );
    
    return hasValidMimeType || hasValidExtension;
  }
}
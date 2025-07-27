import * as cheerio from 'cheerio';

export interface ParsedContent {
  plainText: string;
  cleanedHtml: string;
  metadata: {
    hasImages: boolean;
    hasLinks: boolean;
    hasTables: boolean;
    wordCount: number;
    encoding: string;
  };
}

export class HtmlParser {
  /**
   * Parse HTML email content and extract clean text
   */
  parseHtmlEmail(htmlContent: string): ParsedContent {
    try {
      const $ = cheerio.load(htmlContent, {
        decodeEntities: true,
        normalizeWhitespace: true,
      });

      // Remove script and style elements
      $('script, style, meta, link').remove();
      
      // Remove tracking pixels and beacons
      $('img[width="1"], img[height="1"], img[style*="width:1px"], img[style*="height:1px"]').remove();
      
      // Remove hidden elements
      $('[style*="display:none"], [style*="visibility:hidden"]').remove();
      
      // Convert common HTML elements to readable text
      this.convertHtmlToText($);
      
      // Extract metadata
      const metadata = this.extractMetadata($, htmlContent);
      
      // Get clean text
      const plainText = this.extractPlainText($);
      
      // Get cleaned HTML (optional, for debugging)
      const cleanedHtml = $.html();

      return {
        plainText,
        cleanedHtml,
        metadata,
      };
    } catch (error) {
      console.error('Error parsing HTML content:', error);
      
      // Fallback: return raw text with HTML tags stripped
      const fallbackText = this.stripHtmlTags(htmlContent);
      
      return {
        plainText: fallbackText,
        cleanedHtml: '',
        metadata: {
          hasImages: false,
          hasLinks: false,
          hasTables: false,
          wordCount: fallbackText.split(/\s+/).length,
          encoding: 'utf-8',
        },
      };
    }
  }

  /**
   * Convert HTML elements to readable text format
   */
  private convertHtmlToText($: cheerio.CheerioAPI): void {
    // Convert headers to text with proper formatting
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      if (text) {
        $el.replaceWith(`\n\n${text.toUpperCase()}\n`);
      }
    });

    // Convert paragraphs
    $('p').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      if (text) {
        $el.replaceWith(`\n${text}\n`);
      }
    });

    // Convert lists
    $('ul, ol').each((_, element) => {
      const $el = $(element);
      let listText = '\n';
      
      $el.find('li').each((index, li) => {
        const $li = $(li);
        const text = $li.text().trim();
        if (text) {
          const prefix = $el.is('ol') ? `${index + 1}. ` : '• ';
          listText += `${prefix}${text}\n`;
        }
      });
      
      $el.replaceWith(listText + '\n');
    });

    // Convert tables to readable format
    $('table').each((_, element) => {
      const $el = $(element);
      let tableText = '\n--- TABLE ---\n';
      
      $el.find('tr').each((_, row) => {
        const $row = $(row);
        const cells: string[] = [];
        
        $row.find('td, th').each((_, cell) => {
          const $cell = $(cell);
          const text = $cell.text().trim();
          if (text) {
            cells.push(text);
          }
        });
        
        if (cells.length > 0) {
          tableText += cells.join(' | ') + '\n';
        }
      });
      
      tableText += '--- END TABLE ---\n\n';
      $el.replaceWith(tableText);
    });

    // Convert links (preserve URL information)
    $('a[href]').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const href = $el.attr('href');
      
      if (text && href && href !== text) {
        $el.replaceWith(`${text} (${href})`);
      } else if (text) {
        $el.replaceWith(text);
      }
    });

    // Convert line breaks
    $('br').replaceWith('\n');
    
    // Convert divs and spans to preserve text with spacing
    $('div, span').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      if (text.trim()) {
        $el.replaceWith(` ${text} `);
      }
    });
  }

  /**
   * Extract clean plain text from processed HTML
   */
  private extractPlainText($: cheerio.CheerioAPI): string {
    let text = $.root().text();
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ');
    
    // Fix line breaks
    text = text.replace(/\n\s+/g, '\n');
    text = text.replace(/\s+\n/g, '\n');
    
    // Remove excessive line breaks
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Trim
    text = text.trim();
    
    return text;
  }

  /**
   * Extract metadata from HTML content
   */
  private extractMetadata($: cheerio.CheerioAPI): ParsedContent['metadata'] {
    const hasImages = $('img').length > 0;
    const hasLinks = $('a[href]').length > 0;
    const hasTables = $('table').length > 0;
    
    const plainText = $.root().text();
    const wordCount = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Try to detect encoding from meta tags
    let encoding = 'utf-8';
    const charsetMeta = $('meta[charset]').attr('charset');
    const httpEquivMeta = $('meta[http-equiv="Content-Type"]').attr('content');
    
    if (charsetMeta) {
      encoding = charsetMeta.toLowerCase();
    } else if (httpEquivMeta && httpEquivMeta.includes('charset=')) {
      const match = httpEquivMeta.match(/charset=([^;]+)/i);
      if (match) {
        encoding = match[1].toLowerCase();
      }
    }

    return {
      hasImages,
      hasLinks,
      hasTables,
      wordCount,
      encoding,
    };
  }

  /**
   * Fallback method to strip HTML tags
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&lt;/g, '<') // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Clean and normalize plain text content
   */
  cleanPlainText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/\s+$/gm, '') // Remove trailing whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .trim();
  }

  /**
   * Extract and clean email signature
   */
  extractSignature(text: string): { content: string; signature: string | null } {
    // Common signature patterns
    const signaturePatterns = [
      /\n--\s*\n/g, // Standard email signature delimiter
      /\nBest regards?\s*,?\s*\n/gi,
      /\nSincerely\s*,?\s*\n/gi,
      /\nKind regards?\s*,?\s*\n/gi,
      /\nThanks?\s*,?\s*\n/gi,
      /\nSent from my \w+/gi, // Mobile signatures
    ];

    for (const pattern of signaturePatterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        const splitIndex = match.index + match[0].length;
        const content = text.substring(0, match.index).trim();
        const signature = text.substring(splitIndex).trim();
        
        // Only consider it a signature if it's reasonably short
        if (signature.length < content.length * 0.3 && signature.length < 500) {
          return { content, signature };
        }
      }
    }

    return { content: text, signature: null };
  }
}
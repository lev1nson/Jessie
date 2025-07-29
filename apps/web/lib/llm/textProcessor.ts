/**
 * Text processing utilities for vectorization
 */

export interface TextChunk {
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}

export interface ProcessedText {
  originalText: string;
  cleanedText: string;
  chunks: TextChunk[];
  totalLength: number;
}

export class TextProcessor {
  private readonly maxChunkSize: number;
  private readonly chunkOverlap: number;
  private readonly minChunkSize: number;

  constructor(
    maxChunkSize: number = 8000, // OpenAI token limit consideration
    chunkOverlap: number = 200,
    minChunkSize: number = 100
  ) {
    this.maxChunkSize = maxChunkSize;
    this.chunkOverlap = chunkOverlap;
    this.minChunkSize = minChunkSize;
  }

  /**
   * Clean and normalize text for processing
   */
  public cleanText(text: string): string {
    if (!text) return '';

    return text
      // Remove control characters except newlines and tabs
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive whitespace but preserve single newlines
      .replace(/[ \t]+/g, ' ')
      // Trim whitespace
      .trim();
  }

  /**
   * Combine email text with attachment texts
   */
  public combineTexts(emailText: string, attachmentTexts: string[]): string {
    const cleanEmailText = this.cleanText(emailText);
    const cleanAttachmentTexts = attachmentTexts
      .map(text => this.cleanText(text))
      .filter(text => text.length > 0);

    const parts: string[] = [];
    
    if (cleanEmailText) {
      parts.push(`EMAIL CONTENT:\n${cleanEmailText}`);
    }

    cleanAttachmentTexts.forEach((text, index) => {
      parts.push(`ATTACHMENT ${index + 1}:\n${text}`);
    });

    return parts.join('\n\n---\n\n');
  }

  /**
   * Split text into chunks for vectorization
   */
  public chunkText(text: string): TextChunk[] {
    const cleanedText = this.cleanText(text);
    
    if (cleanedText.length <= this.maxChunkSize) {
      return [{
        content: cleanedText,
        index: 0,
        metadata: { isComplete: true }
      }];
    }

    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < cleanedText.length) {
      let endIndex = Math.min(startIndex + this.maxChunkSize, cleanedText.length);
      
      // Try to break at sentence boundaries
      if (endIndex < cleanedText.length) {
        const sentenceEnd = this.findSentenceBreak(cleanedText, endIndex);
        if (sentenceEnd > startIndex + this.minChunkSize) {
          endIndex = sentenceEnd;
        }
      }

      const chunkContent = cleanedText.slice(startIndex, endIndex).trim();
      
      if (chunkContent.length >= this.minChunkSize || chunkIndex === 0) {
        chunks.push({
          content: chunkContent,
          index: chunkIndex,
          metadata: {
            startIndex,
            endIndex,
            isComplete: endIndex >= cleanedText.length
          }
        });
        chunkIndex++;
      }

      // Move start index with overlap
      startIndex = Math.max(endIndex - this.chunkOverlap, startIndex + this.minChunkSize);
      
      // Prevent infinite loop
      if (startIndex >= cleanedText.length) break;
    }

    return chunks;
  }

  /**
   * Process text for vectorization (clean + chunk)
   */
  public processText(text: string): ProcessedText {
    const cleanedText = this.cleanText(text);
    const chunks = this.chunkText(cleanedText);

    return {
      originalText: text,
      cleanedText,
      chunks,
      totalLength: cleanedText.length
    };
  }

  /**
   * Validate text size for LLM API limits
   */
  public validateTextSize(text: string): { isValid: boolean; reason?: string } {
    if (!text || text.trim().length === 0) {
      return { isValid: false, reason: 'Text is empty' };
    }

    const cleanedText = this.cleanText(text);
    
    // Rough token estimation (1 token ≈ 4 characters for English)
    const estimatedTokens = Math.ceil(cleanedText.length / 4);
    const maxTokens = 8191; // OpenAI text-embedding-3-small limit

    if (estimatedTokens > maxTokens) {
      return { 
        isValid: false, 
        reason: `Text too long: ~${estimatedTokens} tokens (max: ${maxTokens})` 
      };
    }

    return { isValid: true };
  }

  /**
   * Find the best place to break text at sentence boundaries
   */
  private findSentenceBreak(text: string, preferredIndex: number): number {
    const searchStart = Math.max(0, preferredIndex - 200);
    const searchEnd = Math.min(text.length, preferredIndex + 200);
    const searchText = text.slice(searchStart, searchEnd);

    // Look for sentence endings
    const sentenceEndings = /[.!?]\s+/g;
    let match;
    let bestBreak = preferredIndex;

    while ((match = sentenceEndings.exec(searchText)) !== null) {
      const absoluteIndex = searchStart + match.index + match[0].length;
      if (absoluteIndex <= preferredIndex + 100 && absoluteIndex >= preferredIndex - 100) {
        bestBreak = absoluteIndex;
      }
    }

    // Fallback to paragraph breaks
    if (bestBreak === preferredIndex) {
      const paragraphBreak = text.lastIndexOf('\n\n', preferredIndex);
      if (paragraphBreak > preferredIndex - 200) {
        bestBreak = paragraphBreak + 2;
      }
    }

    return bestBreak;
  }
}

export default TextProcessor;
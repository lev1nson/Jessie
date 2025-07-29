import { describe, it, expect, beforeEach } from 'vitest';
import TextProcessor from '../textProcessor';

describe('TextProcessor', () => {
  let textProcessor: TextProcessor;

  beforeEach(() => {
    textProcessor = new TextProcessor();
  });

  describe('cleanText', () => {
    it('should remove excessive whitespace', () => {
      const input = 'Hello    world\n\n\n\nTest';
      const result = textProcessor.cleanText(input);
      
      expect(result).toBe('Hello world\n\nTest');
    });

    it('should normalize line endings', () => {
      const input = 'Line1\r\nLine2\rLine3\nLine4';
      const result = textProcessor.cleanText(input);
      
      expect(result).toBe('Line1\nLine2\nLine3\nLine4');
    });

    it('should handle empty input', () => {
      expect(textProcessor.cleanText('')).toBe('');
      expect(textProcessor.cleanText('   ')).toBe('');
    });

    it('should remove control characters', () => {
      // eslint-disable-next-line no-control-regex
      const input = 'Hello\x00\x01World\x7F';
      const result = textProcessor.cleanText(input);
      
      expect(result).toBe('HelloWorld');
    });
  });

  describe('combineTexts', () => {
    it('should combine email and attachment texts', () => {
      const emailText = 'Email content here';
      const attachmentTexts = ['Attachment 1 content', 'Attachment 2 content'];
      
      const result = textProcessor.combineTexts(emailText, attachmentTexts);
      
      expect(result).toContain('EMAIL CONTENT:\nEmail content here');
      expect(result).toContain('ATTACHMENT 1:\nAttachment 1 content');
      expect(result).toContain('ATTACHMENT 2:\nAttachment 2 content');
      expect(result).toContain('---');
    });

    it('should handle empty attachments', () => {
      const emailText = 'Email content';
      const attachmentTexts = ['', '   ', 'Valid attachment'];
      
      const result = textProcessor.combineTexts(emailText, attachmentTexts);
      
      expect(result).toContain('EMAIL CONTENT:\nEmail content');
      expect(result).toContain('ATTACHMENT 1:\nValid attachment');
      expect(result).not.toContain('ATTACHMENT 2:');
    });

    it('should handle empty email text', () => {
      const emailText = '';
      const attachmentTexts = ['Attachment content'];
      
      const result = textProcessor.combineTexts(emailText, attachmentTexts);
      
      expect(result).not.toContain('EMAIL CONTENT:');
      expect(result).toContain('ATTACHMENT 1:\nAttachment content');
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for small text', () => {
      const text = 'Short text that fits in one chunk';
      const chunks = textProcessor.chunkText(text);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].metadata?.isComplete).toBe(true);
    });

    it('should split large text into multiple chunks', () => {
      const largeText = 'A'.repeat(10000);
      const chunks = textProcessor.chunkText(largeText);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
    });

    it('should try to break at sentence boundaries', () => {
      const text = 'First sentence. Second sentence. ' + 'A'.repeat(8000) + '. Final sentence.';
      const chunks = textProcessor.chunkText(text);
      
      expect(chunks.length).toBeGreaterThan(1);
      // First chunk should end at a sentence boundary if possible
      expect(chunks[0].content).toMatch(/\.\s*$/);
    });
  });

  describe('processText', () => {
    it('should return processed text with chunks', () => {
      const input = 'Test   text\n\n\nwith   formatting';
      const result = textProcessor.processText(input);
      
      expect(result.originalText).toBe(input);
      expect(result.cleanedText).toBe('Test text\n\nwith formatting');
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(result.cleanedText);
      expect(result.totalLength).toBe(result.cleanedText.length);
    });
  });

  describe('validateTextSize', () => {
    it('should validate normal text size', () => {
      const text = 'Normal sized text';
      const result = textProcessor.validateTextSize(text);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject empty text', () => {
      const result = textProcessor.validateTextSize('');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Text is empty');
    });

    it('should reject text that is too long', () => {
      const longText = 'A'.repeat(40000); // ~10k tokens
      const result = textProcessor.validateTextSize(longText);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Text too long');
    });
  });
});
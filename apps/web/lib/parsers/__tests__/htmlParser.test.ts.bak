import { describe, it, expect, beforeEach } from 'vitest';
import { HtmlParser } from '../htmlParser';

describe('HtmlParser', () => {
  let htmlParser: HtmlParser;

  beforeEach(() => {
    htmlParser = new HtmlParser();
  });

  describe('parseHtmlEmail', () => {
    it('should parse simple HTML email correctly', () => {
      const htmlContent = `
        <html>
          <head><title>Test Email</title></head>
          <body>
            <h1>Welcome</h1>
            <p>This is a test email with <strong>bold text</strong>.</p>
            <p>Another paragraph here.</p>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('WELCOME');
      expect(result.plainText).toContain('This is a test email with bold text.');
      expect(result.plainText).toContain('Another paragraph here.');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.encoding).toBe('utf-8');
    });

    it('should remove script and style elements', () => {
      const htmlContent = `
        <html>
          <head>
            <script>alert('malicious');</script>
            <style>body { color: red; }</style>
          </head>
          <body>
            <p>Clean content</p>
            <script>console.log('also malicious');</script>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).not.toContain('alert');
      expect(result.plainText).not.toContain('malicious');
      expect(result.plainText).not.toContain('color: red');
      expect(result.plainText).toContain('Clean content');
    });

    it('should remove tracking pixels and beacons', () => {
      const htmlContent = `
        <html>
          <body>
            <p>Email content</p>
            <img width="1" height="1" src="tracking.gif" />
            <img style="width:1px;height:1px" src="beacon.png" />
            <img src="normal-image.jpg" alt="Normal image" />
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('Email content');
      expect(result.plainText).not.toContain('tracking.gif');
      expect(result.plainText).not.toContain('beacon.png');
      // Normal images should be preserved in some form
      expect(result.metadata.hasImages).toBe(true);
    });

    it('should convert headers to readable format', () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Main Title</h1>
            <h2>Subtitle</h2>
            <h3>Section Header</h3>
            <p>Content below headers</p>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('MAIN TITLE');
      expect(result.plainText).toContain('SUBTITLE');
      expect(result.plainText).toContain('SECTION HEADER');
      expect(result.plainText).toContain('Content below headers');
    });

    it('should convert lists to readable format', () => {
      const htmlContent = `
        <html>
          <body>
            <ul>
              <li>First item</li>
              <li>Second item</li>
              <li>Third item</li>
            </ul>
            <ol>
              <li>Numbered one</li>
              <li>Numbered two</li>
            </ol>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('• First item');
      expect(result.plainText).toContain('• Second item');
      expect(result.plainText).toContain('• Third item');
      expect(result.plainText).toContain('1. Numbered one');
      expect(result.plainText).toContain('2. Numbered two');
    });

    it('should convert tables to readable format', () => {
      const htmlContent = `
        <html>
          <body>
            <table>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>City</th>
              </tr>
              <tr>
                <td>John</td>
                <td>30</td>
                <td>New York</td>
              </tr>
              <tr>
                <td>Jane</td>
                <td>25</td>
                <td>Boston</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('--- TABLE ---');
      expect(result.plainText).toContain('Name | Age | City');
      expect(result.plainText).toContain('John | 30 | New York');
      expect(result.plainText).toContain('Jane | 25 | Boston');
      expect(result.plainText).toContain('--- END TABLE ---');
      expect(result.metadata.hasTables).toBe(true);
    });

    it('should preserve link information', () => {
      const htmlContent = `
        <html>
          <body>
            <p>Visit our <a href="https://example.com">website</a> for more info.</p>
            <p>Email us at <a href="mailto:test@example.com">test@example.com</a></p>
            <p><a href="https://long-url.com/path">https://long-url.com/path</a></p>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('website (https://example.com)');
      expect(result.plainText).toContain('test@example.com (mailto:test@example.com)');
      expect(result.plainText).toContain('https://long-url.com/path');
      expect(result.metadata.hasLinks).toBe(true);
    });

    it('should detect metadata correctly', () => {
      const htmlContent = `
        <html>
          <head>
            <meta charset="ISO-8859-1">
          </head>
          <body>
            <p>Text with <a href="https://example.com">link</a></p>
            <img src="image.jpg" alt="Test image">
            <table><tr><td>Table cell</td></tr></table>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.metadata.hasLinks).toBe(true);
      expect(result.metadata.hasImages).toBe(true);
      expect(result.metadata.hasTables).toBe(true);
      expect(result.metadata.encoding).toBe('iso-8859-1');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should handle different charset encodings', () => {
      const htmlContent1 = `
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body><p>Content</p></body>
        </html>
      `;

      const htmlContent2 = `
        <html>
          <head>
            <meta http-equiv="Content-Type" content="text/html; charset=Windows-1252">
          </head>
          <body><p>Content</p></body>
        </html>
      `;

      const result1 = htmlParser.parseHtmlEmail(htmlContent1);
      const result2 = htmlParser.parseHtmlEmail(htmlContent2);

      expect(result1.metadata.encoding).toBe('utf-8');
      expect(result2.metadata.encoding).toBe('windows-1252');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = `
        <html>
          <body>
            <p>Unclosed paragraph
            <div>Nested without closing
            <span>More nesting
            Some plain text
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(malformedHtml);

      expect(result.plainText).toContain('Unclosed paragraph');
      expect(result.plainText).toContain('Some plain text');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should handle empty or invalid HTML', () => {
      const emptyResult = htmlParser.parseHtmlEmail('');
      expect(emptyResult.plainText).toBe('');
      expect(emptyResult.metadata.wordCount).toBe(0);

      const invalidResult = htmlParser.parseHtmlEmail('not html content');
      expect(invalidResult.plainText).toContain('not html content');
      expect(invalidResult.metadata.wordCount).toBe(3);
    });

    it('should fall back to tag stripping on parse errors', () => {
      // Mock cheerio to throw an error
      const originalConsoleError = console.error;
      console.error = () => {}; // Suppress error logs in tests

      try {
        const htmlContent = '<p>Content with <strong>tags</strong></p>';
        const result = htmlParser.parseHtmlEmail(htmlContent);

        expect(result.plainText).toContain('Content with tags');
        expect(result.metadata.wordCount).toBeGreaterThan(0);
      } finally {
        console.error = originalConsoleError;
      }
    });
  });

  describe('cleanPlainText', () => {
    it('should normalize line endings', () => {
      const text = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = htmlParser.cleanPlainText(text);

      expect(result).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should convert tabs to spaces', () => {
      const text = 'Text\twith\ttabs';
      const result = htmlParser.cleanPlainText(text);

      expect(result).toBe('Text    with    tabs');
    });

    it('should remove trailing whitespace from lines', () => {
      const text = 'Line 1   \nLine 2\t\n   Line 3   ';
      const result = htmlParser.cleanPlainText(text);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should limit consecutive line breaks', () => {
      const text = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const result = htmlParser.cleanPlainText(text);

      expect(result).toBe('Paragraph 1\n\nParagraph 2');
    });
  });

  describe('extractSignature', () => {
    it('should extract standard email signatures', () => {
      const text = `
        Email body content here.
        
        --
        John Doe
        Software Engineer
        Company Inc.
      `.trim();

      const result = htmlParser.extractSignature(text);

      expect(result.content).toContain('Email body content');
      expect(result.content).not.toContain('John Doe');
      expect(result.signature).toContain('John Doe');
      expect(result.signature).toContain('Software Engineer');
    });

    it('should extract signatures with common closings', () => {
      const text = `
        Thanks for your help with the project.
        
        Best regards,
        Jane Smith
        Project Manager
      `.trim();

      const result = htmlParser.extractSignature(text);

      expect(result.content).toContain('Thanks for your help');
      expect(result.content).not.toContain('Best regards');
      expect(result.signature).toContain('Jane Smith');
      expect(result.signature).toContain('Project Manager');
    });

    it('should extract mobile signatures', () => {
      const text = `
        Quick reply from mobile.
        
        Sent from my iPhone
      `.trim();

      const result = htmlParser.extractSignature(text);

      expect(result.content).toContain('Quick reply from mobile');
      expect(result.signature).toContain('Sent from my iPhone');
    });

    it('should not extract signatures if they are too long', () => {
      const longSignature = 'Signature '.repeat(100); // Very long signature
      const text = `
        Short email content.
        
        --
        ${longSignature}
      `.trim();

      const result = htmlParser.extractSignature(text);

      expect(result.content).toBe(text);
      expect(result.signature).toBeNull();
    });

    it('should return original text if no signature found', () => {
      const text = 'Just a simple email without signature';
      const result = htmlParser.extractSignature(text);

      expect(result.content).toBe(text);
      expect(result.signature).toBeNull();
    });

    it('should handle multiple signature patterns and choose the first', () => {
      const text = `
        Email content here.
        
        Best regards,
        John
        
        --
        Company signature
      `.trim();

      const result = htmlParser.extractSignature(text);

      expect(result.content).toContain('Email content');
      expect(result.content).not.toContain('Best regards');
      expect(result.signature).toContain('John');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle HTML with only whitespace', () => {
      const htmlContent = '<html><body>   \n\t   </body></html>';
      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should handle HTML with unicode characters', () => {
      const htmlContent = `
        <html>
          <body>
            <p>Unicode: 你好 🌟 café naïve résumé</p>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('你好');
      expect(result.plainText).toContain('🌟');
      expect(result.plainText).toContain('café');
      expect(result.plainText).toContain('naïve');
      expect(result.plainText).toContain('résumé');
    });

    it('should handle deeply nested HTML structures', () => {
      let nestedHtml = '<div>Content';
      for (let i = 0; i < 100; i++) {
        nestedHtml += '<div><span><p>';
      }
      nestedHtml += 'Deep content';
      for (let i = 0; i < 100; i++) {
        nestedHtml += '</p></span></div>';
      }
      nestedHtml += '</div>';

      const result = htmlParser.parseHtmlEmail(`<html><body>${nestedHtml}</body></html>`);

      expect(result.plainText).toContain('Content');
      expect(result.plainText).toContain('Deep content');
    });

    it('should handle HTML with broken encoding', () => {
      const htmlContent = `
        <html>
          <body>
            <p>Text with &nbsp; and &amp; entities</p>
            <p>Broken entity: &invalid;</p>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('Text with   and & entities');
      // Should handle broken entities gracefully
      expect(result.plainText).toContain('invalid');
    });

    it('should handle very large HTML content', () => {
      const largeContent = '<p>' + 'word '.repeat(10000) + '</p>';
      const htmlContent = `<html><body>${largeContent}</body></html>`;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText.length).toBeGreaterThan(10000);
      expect(result.metadata.wordCount).toBeGreaterThan(9000);
    });

    it('should handle hidden elements correctly', () => {
      const htmlContent = `
        <html>
          <body>
            <p>Visible content</p>
            <div style="display:none">Hidden content</div>
            <span style="visibility:hidden">Also hidden</span>
          </body>
        </html>
      `;

      const result = htmlParser.parseHtmlEmail(htmlContent);

      expect(result.plainText).toContain('Visible content');
      expect(result.plainText).not.toContain('Hidden content');
      expect(result.plainText).not.toContain('Also hidden');
    });
  });
});
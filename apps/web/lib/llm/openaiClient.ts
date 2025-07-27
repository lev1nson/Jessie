import OpenAI from 'openai';

/**
 * OpenAI client configuration and initialization
 */
class OpenAIClient {
  private client: OpenAI;
  private static instance: OpenAIClient;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 30000, // 30 seconds timeout
      maxRetries: 3,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test', // Allow in test environment
    });
  }

  /**
   * Get singleton instance of OpenAI client
   */
  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  /**
   * Get the OpenAI client instance
   */
  public getClient(): OpenAI {
    return this.client;
  }

  /**
   * Test connection to OpenAI API
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export default OpenAIClient;
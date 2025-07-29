import { NextRequest, NextResponse } from 'next/server';
import { recordMetric } from './metrics';

/**
 * Middleware to automatically collect API performance metrics
 */
export function createMetricsMiddleware(apiName: string) {
  return async function metricsMiddleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    let response: NextResponse;
    let error: Error | null = null;
    
    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    
    const responseTime = Date.now() - startTime;
    const status = response.status;
    
    // Record response time metric
    await recordMetric(`${apiName}_response_time`, responseTime, {
      tags: {
        method,
        pathname,
        status: status.toString(),
        success: status < 400 ? 'true' : 'false'
      }
    });
    
    // Record API call count
    await recordMetric(`${apiName}_requests`, 1, {
      tags: {
        method,
        pathname,
        status: status.toString()
      }
    });
    
    // Record error rate if there was an error
    if (error || status >= 400) {
      await recordMetric(`${apiName}_errors`, 1, {
        tags: {
          method,
          pathname,
          status: status.toString(),
          error_type: error?.name || 'http_error'
        }
      });
    }
    
    return response;
  };
}

/**
 * Higher-order function to wrap API routes with metrics collection
 */
export function withMetrics<T extends any[]>(
  apiName: string,
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const middleware = createMetricsMiddleware(apiName);
    
    return middleware(request, () => handler(...args));
  };
}

/**
 * Collect email sync performance metrics
 */
export async function recordEmailSyncMetrics(
  userId: string,
  emailsProcessed: number,
  syncDuration: number,
  errors: number = 0
) {
  const tags = { user_id: userId };
  
  await Promise.all([
    recordMetric('email_sync_duration', syncDuration, { tags }),
    recordMetric('emails_processed', emailsProcessed, { tags }),
    recordMetric('emails_processed_per_hour', (emailsProcessed / syncDuration) * 3600000, { tags }),
    ...(errors > 0 ? [recordMetric('email_sync_errors', errors, { tags })] : [])
  ]);
}

/**
 * Collect vector search performance metrics
 */
export async function recordVectorSearchMetrics(
  userId: string,
  query: string,
  responseTime: number,
  resultsCount: number
) {
  const tags = { 
    user_id: userId,
    query_length: query.length.toString(),
    results_count: resultsCount.toString()
  };
  
  await Promise.all([
    recordMetric('vector_search_response_time', responseTime, { tags }),
    recordMetric('vector_search_queries', 1, { tags }),
    recordMetric('vector_search_results', resultsCount, { tags })
  ]);
}

/**
 * Collect chat API performance metrics
 */
export async function recordChatMetrics(
  userId: string,
  messageLength: number,
  responseTime: number,
  tokensUsed: number = 0
) {
  const tags = { 
    user_id: userId,
    message_length: Math.floor(messageLength / 100) * 100 // Group by 100s
  };
  
  await Promise.all([
    recordMetric('chat_api_response_time', responseTime, { tags }),
    recordMetric('chat_messages', 1, { tags }),
    ...(tokensUsed > 0 ? [recordMetric('chat_tokens_used', tokensUsed, { tags })] : [])
  ]);
}

/**
 * Collect database query performance metrics
 */
export async function recordDatabaseMetrics(
  operation: string,
  table: string,
  responseTime: number,
  recordsAffected: number = 0
) {
  const tags = { 
    operation,
    table,
    records_affected: recordsAffected > 0 ? recordsAffected.toString() : '0'
  };
  
  await Promise.all([
    recordMetric('database_query_time', responseTime, { tags }),
    recordMetric('database_operations', 1, { tags }),
    ...(recordsAffected > 0 ? [recordMetric('database_records_affected', recordsAffected, { tags })] : [])
  ]);
}
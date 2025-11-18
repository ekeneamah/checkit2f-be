import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Global logging interceptor
 * Logs all HTTP requests and responses for monitoring and debugging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Generate unique request ID for tracing
    const requestId = this.generateRequestId();
    request['requestId'] = requestId;

    // Log incoming request
    this.logger.log(
      `📥 [${requestId}] ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`
    );

    // Log request body for POST/PUT/PATCH requests (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
      const sanitizedBody = this.sanitizeRequestBody(request.body);
      this.logger.debug(
        `📝 [${requestId}] Request Body: ${JSON.stringify(sanitizedBody)}`
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // Log successful response
          this.logger.log(
            `📤 [${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`
          );

          // Log response data in development mode (excluding sensitive data)
          if (process.env.NODE_ENV === 'development' && data) {
            const sanitizedData = this.sanitizeResponseData(data);
            this.logger.debug(
              `📋 [${requestId}] Response Data: ${JSON.stringify(sanitizedData)}`
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          // Log error response
          this.logger.error(
            `❌ [${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`
          );
        },
      }),
    );
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize response data to remove sensitive information
   */
  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    if (Array.isArray(sanitized)) {
      return sanitized.map(item => this.sanitizeResponseData(item));
    }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
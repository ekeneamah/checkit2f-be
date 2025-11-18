import { Module, Global } from '@nestjs/common';

import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

/**
 * Common module providing shared utilities and services
 * Marked as Global to be available throughout the application
 */
@Global()
@Module({
  providers: [
    GlobalExceptionFilter,
    LoggingInterceptor,
  ],
  exports: [
    GlobalExceptionFilter,
    LoggingInterceptor,
  ],
})
export class CommonModule {
  constructor() {
    console.log('🔧 Common Module initialized');
  }
}
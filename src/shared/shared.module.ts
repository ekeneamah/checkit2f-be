import { Module, Global } from '@nestjs/common';

/**
 * Shared module for common business logic and utilities
 * Available globally across all modules
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class SharedModule {
  constructor() {
    console.log('🌐 Shared Module initialized');
  }
}
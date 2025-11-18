import { Module } from '@nestjs/common';

/**
 * User module
 * Handles user management functionality
 */
@Module({
  imports: [],
  providers: [],
  controllers: [],
  exports: [],
})
export class UserModule {
  constructor() {
    console.log('👤 User Module initialized');
  }
}
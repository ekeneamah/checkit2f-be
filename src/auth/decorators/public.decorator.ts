import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator
 * Marks routes as public (no authentication required)
 * 
 * @example
 * @Public()
 * @Get('/health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
import { SetMetadata } from '@nestjs/common';
import { Permission } from '../interfaces/auth.interface';

/**
 * Permissions decorator
 * Restricts access to users with specific permissions
 * 
 * @example
 * @Permissions(Permission.USER_READ, Permission.USER_WRITE)
 * @Post('/users')
 * createUser() {
 *   return { message: 'User creation access granted' };
 * }
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
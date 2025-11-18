import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../interfaces/auth.interface';

/**
 * Roles decorator
 * Restricts access to users with specific roles
 * 
 * @example
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Post('/admin-only')
 * adminOnlyEndpoint() {
 *   return { message: 'Admin access granted' };
 * }
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
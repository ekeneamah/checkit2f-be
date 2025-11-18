import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole, Permission } from '../interfaces/auth.interface';
import { Roles } from './roles.decorator';
import { Permissions } from './permissions.decorator';

/**
 * Authentication decorator
 * Applies JWT authentication to the route
 * 
 * @example
 * @Auth()
 * @Get('/protected')
 * protectedRoute() {
 *   return { message: 'Access granted' };
 * }
 */
export function Auth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

/**
 * Authorization decorator with roles
 * Applies JWT authentication and role-based authorization
 * 
 * @example
 * @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Post('/admin-action')
 * adminAction() {
 *   return { message: 'Admin action completed' };
 * }
 */
export function AuthWithRoles(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );
}

/**
 * Authorization decorator with permissions
 * Applies JWT authentication and permission-based authorization
 * 
 * @example
 * @AuthWithPermissions(Permission.USER_READ, Permission.USER_WRITE)
 * @Post('/users')
 * createUser() {
 *   return { message: 'User created' };
 * }
 */
export function AuthWithPermissions(...permissions: Permission[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Permissions(...permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );
}

/**
 * Authorization decorator with both roles and permissions
 * Applies JWT authentication with both role and permission checks
 * 
 * @example
 * @AuthWithRolesAndPermissions(
 *   [UserRole.ADMIN], 
 *   [Permission.VERIFICATION_APPROVE]
 * )
 * @Post('/approve')
 * approveVerification() {
 *   return { message: 'Verification approved' };
 * }
 */
export function AuthWithRolesAndPermissions(roles: UserRole[], permissions: Permission[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    Permissions(...permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden' }),
  );
}
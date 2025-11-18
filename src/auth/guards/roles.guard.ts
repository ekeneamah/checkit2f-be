import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, Permission, IUser } from '../interfaces/auth.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';


/**
 * Role-Based Access Control Guard
 * Validates user roles and permissions
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  /**
   * Validate user roles and permissions
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles or permissions are required, allow access
    if (!requiredRoles && !requiredPermissions) {
      this.logger.log('No role/permission restrictions, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: IUser = request.user;

    if (!user) {
      this.logger.warn('No user found in request for role validation');
      throw new ForbiddenException('User not authenticated');
    }

    // Check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = this.validateRoles(user, requiredRoles);
      if (!hasRole) {
        this.logger.warn(
          `Access denied: User ${user.email} with role ${user.role} does not have required roles: ${requiredRoles.join(', ')}`
        );
        throw new ForbiddenException('Insufficient role privileges');
      }
    }

    // Check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = this.validatePermissions(user, requiredPermissions);
      if (!hasPermissions) {
        this.logger.warn(
          `Access denied: User ${user.email} does not have required permissions: ${requiredPermissions.join(', ')}`
        );
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    this.logger.log(
      `Access granted: User ${user.email} with role ${user.role} has required access`
    );
    return true;
  }

  /**
   * Validate user roles
   */
  private validateRoles(user: IUser, requiredRoles: UserRole[]): boolean {
    // Super admin has access to everything
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.includes(user.role);
  }

  /**
   * Validate user permissions
   */
  private validatePermissions(user: IUser, requiredPermissions: Permission[]): boolean {
    // Super admin has all permissions
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
  }

  /**
   * Check if user has specific role
   */
  static hasRole(user: IUser, role: UserRole): boolean {
    return user.role === UserRole.SUPER_ADMIN || user.role === role;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: IUser, permission: Permission): boolean {
    return user.role === UserRole.SUPER_ADMIN || user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: IUser, roles: UserRole[]): boolean {
    return user.role === UserRole.SUPER_ADMIN || roles.includes(user.role);
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(user: IUser, permissions: Permission[]): boolean {
    return user.role === UserRole.SUPER_ADMIN || 
           permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: IUser, permissions: Permission[]): boolean {
    return user.role === UserRole.SUPER_ADMIN || 
           permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Get user's effective permissions (including role-based permissions)
   */
  static getEffectivePermissions(user: IUser): Permission[] {
    if (user.role === UserRole.SUPER_ADMIN) {
      // Super admin has all permissions
      return Object.values(Permission);
    }

    return user.permissions;
  }

  /**
   * Check if user can access resource owned by another user
   */
  static canAccessUserResource(currentUser: IUser, resourceOwnerId: string): boolean {
    // Super admin can access everything
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Admin can access resources of lower-level users
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    // Users can only access their own resources
    return currentUser.id === resourceOwnerId;
  }

  /**
   * Check if user can manage another user
   */
  static canManageUser(manager: IUser, targetUser: IUser): boolean {
    // Super admin can manage everyone
    if (manager.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Admin can manage non-admin users
    if (manager.role === UserRole.ADMIN) {
      return targetUser.role !== UserRole.SUPER_ADMIN && targetUser.role !== UserRole.ADMIN;
    }

    // Agent managers can manage agents
    if (manager.role === UserRole.AGENT_MANAGER) {
      return targetUser.role === UserRole.AGENT || targetUser.role === UserRole.CLIENT;
    }

    return false;
  }

  /**
   * Get hierarchical role level (for comparison)
   */
  private static getRoleLevel(role: UserRole): number {
    const roleLevels = {
      [UserRole.SUPER_ADMIN]: 100,
      [UserRole.ADMIN]: 80,
      [UserRole.AGENT_MANAGER]: 60,
      [UserRole.AGENT]: 40,
      [UserRole.CLIENT]: 20,
      [UserRole.GUEST]: 10,
    };

    return roleLevels[role] || 0;
  }

  /**
   * Check if user has higher role level than another user
   */
  static hasHigherRole(user1: IUser, user2: IUser): boolean {
    return this.getRoleLevel(user1.role) > this.getRoleLevel(user2.role);
  }
}
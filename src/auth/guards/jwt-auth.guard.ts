import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 * Protects routes with JWT authentication
 * Respects @Public() decorator for public routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if authentication is required
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Public route accessed, skipping JWT validation');
      return true;
    }

    this.logger.log('Protected route accessed, validating JWT');
    return super.canActivate(context);
  }

  /**
   * Handle authentication request
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest();
    
    // Log authentication attempt
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const ip = request.ip || request.connection.remoteAddress || 'Unknown';
    
    if (err || !user) {
      this.logger.warn(
        `Authentication failed for ${ip} (${userAgent}): ${err?.message || info?.message || 'Unknown error'}`
      );
      throw err || new UnauthorizedException('Authentication failed');
    }

    this.logger.log(`Authentication successful for user: ${user.email} from ${ip}`);
    
    // Add authentication metadata to request
    request.authInfo = {
      authenticatedAt: new Date(),
      userAgent,
      ip,
    };

    return user;
  }
}
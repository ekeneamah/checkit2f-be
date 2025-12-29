import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IUser, UserRole } from '../interfaces/auth.interface';
import { UserService } from '../services/user.service';
import { JwtAuthService } from '../services/jwt-auth.service';
import { GetAgentUseCase } from '../../agent/application/use-cases/get-agent.use-case';
import { AgentStatus } from '../../agent/domain/enums/agent.enum';

/**
 * JWT Passport Strategy
 * Validates JWT tokens and attaches user to request
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    @Inject(GetAgentUseCase) private readonly getAgentUseCase: GetAgentUseCase,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });

    console.log('🔑 JWT Strategy initialized');
  }

  /**
   * Validate JWT payload and return user
   */
  async validate(request: any, payload: IJwtPayload): Promise<IUser> {
    try {
      this.logger.log(`Validating JWT for user: ${payload.email}`);

      // Extract token from request
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.jwtAuthService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Validate token type
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check user role and fetch from appropriate table
      let user: any;
      
      if (payload.role === UserRole.AGENT) {
        // Get agent from agents collection
        try {
          const agent = await this.getAgentUseCase.getById(payload.sub);
          
          // Transform agent to user-like object for compatibility
          user = {
            id: agent.id,
            email: agent.contactInfo.email,
            role: UserRole.AGENT,
            isActive: agent.status === AgentStatus.ACTIVE,
            firstName: agent.firstName,
            lastName: agent.lastName,
          };
          
          this.logger.log(`JWT validation successful for agent: ${user.email}`);
        } catch (error) {
          throw new UnauthorizedException('Agent not found');
        }
      } else {
        // Get user from users collection
        user = await this.userService.findUserById(payload.sub);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        // Check if user is active
        if (!user.isActive) {
          throw new UnauthorizedException('User account is deactivated');
        }

        // Verify token payload matches current user data
        if (user.email !== payload.email || user.role !== payload.role) {
          throw new UnauthorizedException('Token payload mismatch');
        }

        this.logger.log(`JWT validation successful for user: ${user.email}`);
      }

      return user;

    } catch (error) {
      this.logger.warn(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
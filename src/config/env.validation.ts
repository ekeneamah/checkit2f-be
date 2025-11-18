import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsOptional, Matches } from 'class-validator';

/**
 * Environment configuration validation class
 * Ensures all required environment variables are present and valid
 */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  DATABASE_URL: string = '';

  @IsString()
  @IsOptional()
  FIREBASE_PROJECT_ID: string = '';

  @IsString()
  @IsOptional()
  FIREBASE_PRIVATE_KEY: string = '';

  @IsString()
  @IsOptional()
  FIREBASE_CLIENT_EMAIL: string = '';

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'default-jwt-secret-change-in-production';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'default-refresh-secret-change-in-production';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  JWT_ISSUER: string = 'checkit24';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE: string = 'checkit24-api';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  BCRYPT_SALT_ROUNDS: number = 12;

  @IsString()
  @IsOptional()
  GOOGLE_MAPS_API_KEY: string = '';

  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY: string = '';

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET: string = '';

  @IsString()
  @IsOptional()
  PAYSTACK_SECRET_KEY: string = '';

  @IsString()
  @IsOptional()
  SMTP_HOST: string = '';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER: string = '';

  @IsString()
  @IsOptional()
  SMTP_PASSWORD: string = '';

  @Matches(/^https?:\/\/.+/, { message: 'FRONTEND_URL must be a valid URL starting with http:// or https://' })
  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:4200';

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_TTL: number = 60000; // 1 minute

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_MAX: number = 100; // 100 requests per minute
}

/**
 * Validates environment configuration
 * @param config - Raw environment variables
 * @returns Validated environment configuration
 * @throws Error if validation fails
 */
export function validateEnvironmentConfig(config: Record<string, unknown>): EnvironmentVariables {
  // Skip validation during Firebase deployment analysis
  if (process.env.FIREBASE_CONFIG) {
    console.log('⏭️  Skipping validation during Firebase deployment analysis');
    return plainToInstance(EnvironmentVariables, config, {
      enableImplicitConversion: true,
    });
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      return Object.values(error.constraints || {}).join(', ');
    }).join('; ');
    
    console.error('❌ Environment validation failed:', errorMessages);
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}
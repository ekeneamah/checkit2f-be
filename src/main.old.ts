import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * Bootstrap function to initialize the NestJS application
 * Sets up security, validation, documentation, and global configurations
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create NestJS application instance
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const environment = configService.get<string>('NODE_ENV', 'development');

    logger.log(`Starting CheckIt24 Backend API in ${environment} mode`);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));

    // Compression middleware
    app.use(compression());

    // CORS configuration
    app.enableCors({
      origin: configService.get<string>('FRONTEND_URL', 'http://localhost:4200'),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Global prefix for all routes
    app.setGlobalPrefix('api/v1');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Swagger API documentation
    if (environment !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('CheckIt24 API')
        .setDescription('Location Verification Platform API Documentation')
        .setVersion('1.0')
        .addTag('Verification Requests', 'Verification request management')
        .addTag('Pricing', 'Public pricing and request type information')
        .addTag('Admin - Request Types', 'Admin endpoints for managing request types')
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Payment Gateway', 'Payment processing with Stripe and Paystack')
        .addTag('Google Maps', 'Location and geocoding services')
        .addTag('🤖 Gemini AI', 'AI-powered content generation')
        .addTag('Health', 'System health checks and monitoring')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      });

      logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
    }

    // Start the application
    await app.listen(port);
    logger.log(`CheckIt24 Backend API is running on port ${port}`);
    logger.log(`Environment: ${environment}`);
    logger.log(`API Base URL: http://localhost:${port}/api/v1`);

  } catch (error) {
    logger.error('Failed to start the application', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
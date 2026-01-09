/**
 * Firebase Functions Entry Point
 * 
 * This file wraps the NestJS application for Firebase Functions deployment.
 * Uses dynamic imports to prevent initialization during deployment discovery.
 */

import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

const server = express();
let isInitialized = false;

// Lazy initialization function
async function initializeApp() {
  if (isInitialized) return;
  
  console.log('🚀 Initializing NestJS application for Firebase Functions...');
  
  // Dynamic imports to defer module loading
  const { NestFactory } = await import('@nestjs/core');
  const { ExpressAdapter } = await import('@nestjs/platform-express');
  const { ValidationPipe, Logger } = await import('@nestjs/common');
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const helmet = (await import('helmet')).default;
  const compression = (await import('compression')).default;
  const { AppModule } = await import('./app.module');
  const { GlobalExceptionFilter } = await import('./common/filters/global-exception.filter');
  const { LoggingInterceptor } = await import('./common/interceptors/logging.interceptor');
  
  const logger = new Logger('FirebaseFunctions');
  
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Compression
  app.use(compression());

  // CORS - Allow frontend domains
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4200',
      'https://zigocheck.web.app',
      'https://zigocheck-admin.web.app',
      'https://zigocheck-agent.web.app',
      'https://checkit24-6e5bf.web.app',
      'https://checkit24-6e5bf.firebaseapp.com',
      'https://app.zigocheck.com',
      'https://admin.zigocheck.com',
      'https://agent.zigocheck.com',
      'https://api.zigocheck.com',
      'https://zigocheck.com',
      'https://www.zigocheck.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Timestamp',
      'x-timestamp',
      'X-Requested-With',
      'Origin',
      'Access-Control-Allow-Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Zigocheck API')
    .setDescription('Location Verification Platform API')
    .setVersion('1.0')
    .addTag('Verification Requests')
    .addTag('Pricing')
    .addTag('Authentication')
    .addTag('Payment Gateway')
    .addTag('Google Maps')
    .addTag('Gemini AI')
    .addTag('Health')
    .addTag('Admin')
    .addTag('Agents')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  logger.log('✅ NestJS application initialized successfully');
  
  isInitialized = true;
}

// Export the Cloud Function (Firebase Functions v2)
export const api = onRequest(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    maxInstances: 10,
    minInstances: 0,
    region: 'us-central1',
    invoker: 'public' // Allow unauthenticated access
  },
  async (req, res) => {
    // Initialize on first request
    await initializeApp();
    // Forward to Express/NestJS
    server(req, res);
  }
);

// Health check endpoint (outside NestJS for faster response)
server.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'zigocheck-api'
  });
});

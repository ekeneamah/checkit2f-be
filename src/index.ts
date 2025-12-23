/**
 * CheckIt24 Firebase Functions
 * 
 * This file serves as the entry point for all Firebase Functions.
 * It wraps the NestJS application to run within Firebase Functions environment.
 */

// Register module alias for @ imports FIRST
import 'module-alias/register';

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { onInit } from 'firebase-functions/v2/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

const server = express();

// Use onInit() hook for deferred initialization
// This runs only when the function is first invoked, not during deploy/discovery
onInit(async () => {
  // Initialize NestJS application
  console.log('🚀 Initializing NestJS application...');
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  // Security middleware
  app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
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
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://checkit24-6e5bf.web.app',
      'https://checkit24-6e5bf.firebaseapp.com'
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

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CheckIt24 API')
    .setDescription('Location Verification Platform API')
    .setVersion('1.0')
    .addTag('Verification Requests')
    .addTag('Pricing')
    .addTag('Authentication')
    .addTag('Payment Gateway')
    .addTag('Google Maps')
    .addTag('Gemini AI')
    .addTag('Health')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  console.log('✅ NestJS application initialized');
});

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
    // Forward to Express/NestJS
    // Initialization happens via onInit() hook on first invocation
    server(req, res);
  }
);

// Add a health check endpoint
server.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
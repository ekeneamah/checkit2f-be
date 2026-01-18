import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

const server = express();
let nestAppInitialized = false;

server.get('/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function initNest() {
  if (nestAppInitialized) return;

  const { NestFactory } = await import('@nestjs/core');
  const { ExpressAdapter } = await import('@nestjs/platform-express');
  const { ValidationPipe } = await import('@nestjs/common');
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('v1');

  await app.init();
  nestAppInitialized = true;

}

export const api = onRequest(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1',
  },
  async (req, res) => {
    await initNest();
    server(req, res);
  }
);

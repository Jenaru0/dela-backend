import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Habilita la validación automática y segura de todos los endpoints
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  // Habilitar CORS para permitir conexiones desde el frontend
  const allowedOrigins = [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://dela.episundc.pe', // Dominio de producción
    process.env.FRONTEND_URL, // Variable de entorno para flexibilidad
  ].filter(Boolean); // Filtrar valores undefined

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});

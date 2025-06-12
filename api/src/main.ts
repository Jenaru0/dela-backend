import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Habilita la validación automática y segura de todos los endpoints
async function bootstrap(): Promise<void> {
  try {
    console.log('🚀 Starting DELA Platform API...');

    // Verificar variables de entorno críticas
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      throw new Error(
        `Missing environment variables: ${missingVars.join(', ')}`,
      );
    }

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Habilitar CORS para permitir conexiones desde el frontend
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://delabackend.episundc.pe', // Para pruebas del backend
    ];

    // Agregar FRONTEND_URL si está definida
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    console.log('✅ CORS configured for origins:', allowedOrigins);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    const port = process.env.PORT ?? 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 API running on port ${port}`);
    console.log(`🌐 Health check available at: http://0.0.0.0:${port}/health`);
    console.log(`🔄 Environment: ${process.env.NODE_ENV}`);
    console.log(
      `🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`,
    );
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser(process.env.COOKIE_SECRET));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4223',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('mhfrough.dev API')
    .setDescription('Personal Portfolio API — Mohammad Hamza')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = process.env.PORT ?? 3032;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs  → http://localhost:${port}/api/docs`);
}
bootstrap();

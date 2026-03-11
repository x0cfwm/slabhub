import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    // Enable CORS for web app
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8081', 'http://64.23.242.93:8081', 'https://slabhub.netlify.app', 'https://slabhub.gg'];

    app.enableCors({
        origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-handle', 'x-user-id'],
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // API versioning prefix
    app.setGlobalPrefix('v1', {
        exclude: ['health', 'api/docs', 'api/docs-json'],
    });

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle('slabhub API')
        .setDescription('The slabhub API documentation for mobile and web apps')
        .setVersion('1.0')
        .addTag('Inventory')
        .addTag('Authentication')
        .addTag('Profile')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        jsonDocumentUrl: 'api/docs-json',
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 API running on http://localhost:${port}`);
    console.log(`📚 Health check: http://localhost:${port}/health`);
    console.log(`📖 Swagger UI: http://localhost:${port}/api/docs`);
    console.log(`📄 Swagger JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();

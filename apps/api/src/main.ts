import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS for web app
    app.enableCors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-user-handle', 'x-user-id'],
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
        exclude: ['health'],
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 API running on http://localhost:${port}`);
    console.log(`📚 Health check: http://localhost:${port}/health`);
}

bootstrap();

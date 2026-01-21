import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

/**
 * Auth module - minimal placeholder for Stage 1.
 * Provides middleware that extracts seller info from headers.
 * Structured for future expansion with proper JWT/OAuth.
 */
@Module({
    providers: [AuthMiddleware],
    exports: [AuthMiddleware],
})
export class AuthModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply auth middleware to all v1 routes
        consumer.apply(AuthMiddleware).forRoutes('*');
    }
}

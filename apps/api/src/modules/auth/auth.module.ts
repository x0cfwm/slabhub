import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';
import { AuthService } from './auth.service';
import { AuthController, MeController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerService, MailerConsoleService } from './mail/mailer.service';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController, MeController],
    providers: [
        AuthService,
        AuthMiddleware,
        {
            provide: MailerService,
            useClass: MailerConsoleService,
        },
    ],
    exports: [AuthService, AuthMiddleware],
})
export class AuthModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply legacy auth middleware to all v1 routes for backward compatibility
        consumer.apply(AuthMiddleware).forRoutes('*');
    }
}

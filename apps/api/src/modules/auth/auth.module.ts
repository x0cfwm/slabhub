import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerService, MailerConsoleService } from './mail/mailer.service';
import { ResendMailerService } from './mail/resend-mailer.service';


@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthMiddleware,
        {
            provide: MailerService,
            useFactory: () => {
                if (process.env.RESEND_API_KEY) {
                    return new ResendMailerService();
                }
                return new MailerConsoleService();
            },
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

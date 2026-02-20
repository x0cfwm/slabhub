import { Module, forwardRef } from '@nestjs/common';
import { OauthFacebookService } from './oauth-facebook.service';
import { OauthFacebookController } from './oauth-facebook.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [forwardRef(() => AuthModule), PrismaModule, HttpModule],
    controllers: [OauthFacebookController],
    providers: [OauthFacebookService],
    exports: [OauthFacebookService],
})
export class OauthFacebookModule { }

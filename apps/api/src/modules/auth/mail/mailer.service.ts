import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export abstract class MailerService {
    abstract sendOtp(email: string, otp: string): Promise<void>;
}

@Injectable()
export class MailerConsoleService extends MailerService {
    private readonly logger = new Logger(MailerConsoleService.name);

    async sendOtp(email: string, otp: string): Promise<void> {
        this.logger.log(`\n\n==========================================\nOTP for ${email}: ${otp}\n==========================================\n\n`);
    }
}

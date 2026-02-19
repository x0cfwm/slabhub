import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../auth/mail/mailer.service';

@Injectable()
export class WaitlistService {
    private readonly logger = new Logger(WaitlistService.name);

    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
    ) { }

    async join(email: string, name?: string) {
        try {
            // Check if already in waitlist
            const existing = await this.prisma.waitlistParticipant.findUnique({
                where: { email },
            });

            if (existing) {
                this.logger.log(`Email ${email} already in waitlist`);
                return { success: true, alreadyExists: true };
            }

            // Add to DB
            await this.prisma.waitlistParticipant.create({
                data: { email, name },
            });

            this.logger.log(`Added ${email} to waitlist`);

            // Send confirmation email
            try {
                await this.mailerService.sendWaitlistConfirmation(email);
            } catch (err) {
                this.logger.error(`Failed to send waitlist confirmation to ${email}`, err);
                // We don't fail the whole request if email fails
            }

            return { success: true };
        } catch (error) {
            this.logger.error(`Error joining waitlist for ${email}`, error);
            throw error;
        }
    }
}

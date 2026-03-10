import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { Resend } from 'resend';

@Injectable()
export class ResendMailerService extends MailerService {
    private readonly logger = new Logger(ResendMailerService.name);
    private readonly resend: Resend;
    private readonly fromEmail = process.env.MAIL_FROM || 'SlabHub <auth@slabhub.gg>';

    constructor() {
        super();
        const apiKey = process.env.RESEND_API_KEY;
        this.resend = new Resend(apiKey);
    }

    async sendOtp(email: string, otp: string): Promise<void> {
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [email],
                subject: `${otp} is your SlabHub verification code`,
                html: this.getOtpHtml(otp),
            });

            if (error) {
                this.logger.error(`Failed to send OTP to ${email}: ${error.message}`);
                throw new InternalServerErrorException(`Resend error: ${error.message}`, { cause: error });
            }

            this.logger.log(`OTP sent to ${email} via Resend. ID: ${data?.id}`);
        } catch (err) {
            this.logger.error(`Error sending OTP to ${email}`, err);
            throw err;
        }
    }

    async sendWaitlistConfirmation(email: string): Promise<void> {
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [email],
                subject: `Welcome to the SlabHub Waitlist!`,
                html: this.getWaitlistHtml(),
            });

            if (error) {
                this.logger.error(`Failed to send waitlist confirmation to ${email}: ${error.message}`);
                throw new InternalServerErrorException(`Resend error: ${error.message}`, { cause: error });
            }

            this.logger.log(`Waitlist confirmation sent to ${email} via Resend. ID: ${data?.id}`);
        } catch (err) {
            this.logger.error(`Error sending waitlist confirmation to ${email}`, err);
            throw err;
        }
    }

    private getOtpHtml(otp: string): string {
        return this.getBaseTemplate(`
            <h1>Verification Code</h1>
            <p>Enter the following code to sign in to your SlabHub account. This code will expire in 10 minutes.</p>
            <div class="otp-container">
                <div class="otp-code">${otp}</div>
            </div>
            <p style="margin-bottom: 0;">If you didn't request this code, you can safely ignore this email.</p>
        `);
    }

    private getWaitlistHtml(): string {
        return this.getBaseTemplate(`
            <h1>You're on the list!</h1>
            <p>Thanks for joining the SlabHub waitlist. We're excited to have you with us.</p>
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 32px; text-align: left;">
                <h2 style="font-size: 16px; font-weight: 600; margin-top: 0; color: #18181b;">What's next?</h2>
                <ul style="padding-left: 20px; margin-bottom: 0; color: #71717a; font-size: 14px;">
                    <li style="margin-bottom: 8px;">We'll notify you as soon as early access is available.</li>
                    <li style="margin-bottom: 8px;">You'll be among the first to manage your collection like a pro.</li>
                    <li>Follow us for updates and sneak peeks!</li>
                </ul>
            </div>
            <p style="margin-bottom: 0;">Stay tuned for more updates soon.</p>
        `);
    }

    private getBaseTemplate(content: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SlabHub</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f4f4f5;
            color: #18181b;
            margin: 0;
            padding: 0;
            line-height: 1.5;
        }
        .container {
            max-width: 480px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.05em;
            color: #18181b;
            text-decoration: none;
            text-transform: uppercase;
        }
        .logo span {
            color: #FBAC00;
        }
        .content {
            text-align: center;
        }
        h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #18181b;
        }
        p {
            font-size: 15px;
            color: #71717a;
            margin-bottom: 32px;
        }
        .otp-container {
            background-color: #f4f4f5;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
            display: inline-block;
            min-width: 200px;
        }
        .otp-code {
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 0.25em;
            color: #18181b;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
        .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e4e4e7;
            text-align: center;
            font-size: 13px;
            color: #a1a1aa;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SLAB<span>HUB</span></div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} SlabHub. All rights reserved.
        </div>
    </div>
</body>
</html>
        `.trim();
    }
}

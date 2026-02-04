import * as crypto from 'crypto';

export class OtpUtils {
    static generateOtp(length = 6): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static hashOtp(otp: string, salt: string): string {
        return crypto
            .createHmac('sha256', process.env.OTP_SECRET || 'dev-secret')
            .update(otp + salt)
            .digest('hex');
    }

    static compareOtp(otp: string, salt: string, hashedOtp: string): boolean {
        const hash = this.hashOtp(otp, salt);
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedOtp));
    }

    static generateSalt(): string {
        return crypto.randomBytes(16).toString('hex');
    }
}

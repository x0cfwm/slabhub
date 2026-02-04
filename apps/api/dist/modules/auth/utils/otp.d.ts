export declare class OtpUtils {
    static generateOtp(length?: number): string;
    static hashOtp(otp: string, salt: string): string;
    static compareOtp(otp: string, salt: string, hashedOtp: string): boolean;
    static generateSalt(): string;
}

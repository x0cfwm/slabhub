export declare abstract class MailerService {
    abstract sendOtp(email: string, otp: string): Promise<void>;
}
export declare class MailerConsoleService extends MailerService {
    private readonly logger;
    sendOtp(email: string, otp: string): Promise<void>;
}

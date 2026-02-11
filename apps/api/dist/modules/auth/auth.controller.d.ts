import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    requestOtp(dto: RequestOtpDto): Promise<{
        ok: boolean;
    }>;
    verifyOtp(dto: VerifyOtpDto, req: Request, res: Response): Promise<{
        ok: boolean;
        user: {
            id: string;
            email: string;
        };
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
}

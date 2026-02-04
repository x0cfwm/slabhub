import { Response } from 'express';
export declare class CookieUtils {
    static setSessionCookie(res: Response, token: string): void;
    static clearSessionCookie(res: Response): void;
}

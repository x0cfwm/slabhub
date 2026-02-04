import { Response } from 'express';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'slabhub_session';
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '30', 10);

export class CookieUtils {
    static setSessionCookie(res: Response, token: string) {
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax', // Use 'lax' for dev to avoid issues with localhost
            maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
            path: '/',
        });
    }

    static clearSessionCookie(res: Response) {
        res.clearCookie(SESSION_COOKIE_NAME, {
            path: '/',
        });
    }
}

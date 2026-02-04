"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieUtils = void 0;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'slabhub_session';
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '30', 10);
class CookieUtils {
    static setSessionCookie(res, token) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
            path: '/',
        });
    }
    static clearSessionCookie(res) {
        res.clearCookie(SESSION_COOKIE_NAME, {
            path: '/',
        });
    }
}
exports.CookieUtils = CookieUtils;
//# sourceMappingURL=cookies.js.map
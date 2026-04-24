// api/auth/login.js
// Vercel Serverless Function
// Redirect user sang GHN SSO v2 để đăng nhập

import crypto from 'crypto';

export default function handler(req, res) {
    // Tạo state và nonce ngẫu nhiên để chống CSRF và replay attack
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Lưu state + nonce vào cookie tạm (httpOnly, secure, SameSite=Lax)
    // Sẽ verify lại ở callback
    const cookieOptions = [
        `oauth_state=${state}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Path=/',
        'Max-Age=600', // 10 phút
    ].join('; ');

    const nonceCookieOptions = [
        `oauth_nonce=${nonce}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Path=/',
        'Max-Age=600',
    ].join('; ');

    res.setHeader('Set-Cookie', [cookieOptions, nonceCookieOptions]);

    // Build authorization URL (Thêm scope email theo tài liệu)
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.GHN_SSO_CLIENT_ID,
        redirect_uri: process.env.GHN_SSO_REDIRECT_URI,
        scope: 'openid profile email',
        state,
        nonce,
    });

    const SSO_BASE = 'https://dev-online-gateway.ghn.vn/sso-v2/public-api';
    const authUrl = `${SSO_BASE}/oauth2/authorize?${params.toString()}`;

    return res.redirect(302, authUrl);
}
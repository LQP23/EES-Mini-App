// api/auth/logout.js
// Vercel Serverless Function
// Clear session cookie + logout khỏi SSO

export default async function handler(req, res) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionRaw = cookies['ghn_ees_session'];

    let idToken = null;

    // Lấy id_token từ session để gửi cho SSO logout
    if (sessionRaw) {
        try {
            const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString('utf8'));
            idToken = session.id_token;
        } catch {
            // Session bị corrupt, bỏ qua
        }
    }

    // Clear session cookie
    const clearSession = [
        'ghn_ees_session=',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Path=/',
        `Domain=${process.env.GHN_COOKIE_DOMAIN || '.ghn.vn'}`,
        'Max-Age=0',
    ].join('; ');

    res.setHeader('Set-Cookie', clearSession);

    // Redirect sang SSO logout (RP-Initiated Logout)
    const SSO_BASE = 'https://dev-online-gateway.ghn.vn/sso-v2/public-api';
    const postLogoutUri = `${process.env.GHN_APP_BASE_URL || 'https://ees.ghn.vn'}/`;

    if (idToken) {
        const params = new URLSearchParams({
            id_token_hint: idToken,
            post_logout_redirect_uri: postLogoutUri,
        });
        return res.redirect(302, `${SSO_BASE}/oauth2/logout?${params.toString()}`);
    }

    // Nếu không có id_token, về trang chủ luôn
    return res.redirect(302, '/');
}

function parseCookies(cookieHeader) {
    return cookieHeader.split(';').reduce((acc, part) => {
        const [key, ...val] = part.trim().split('=');
        if (key) acc[key.trim()] = decodeURIComponent(val.join('='));
        return acc;
    }, {});
}
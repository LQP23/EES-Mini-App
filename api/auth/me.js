// api/auth/me.js
// Vercel Serverless Function
// Frontend gọi endpoint này để biết user đã login chưa và lấy thông tin

export default function handler(req, res) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionRaw = cookies['ghn_ees_session'];

    if (!sessionRaw) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString('utf8'));

        // Check session còn hạn không (7 ngày = 604800000ms)
        const SESSION_TTL = 604800 * 1000;
        if (Date.now() - session.issued_at > SESSION_TTL) {
            // Session hết hạn
            res.setHeader('Set-Cookie', [
                `ghn_ees_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=${process.env.GHN_COOKIE_DOMAIN || '.ghn.vn'}; Max-Age=0`,
            ]);
            return res.status(401).json({ authenticated: false, reason: 'session_expired' });
        }

        // Trả về thông tin user (KHÔNG trả access_token / id_token về frontend)
        return res.status(200).json({
            authenticated: true,
            user: {
                sub: session.sub,
                name: session.name,
                employee_id: session.employee_id,
                team_name: session.team_name,
                team_id: session.team_id,
                jobtitle_name: session.jobtitle_name,
                phone_number: session.phone_number,
            },
        });

    } catch {
        return res.status(401).json({ authenticated: false, reason: 'invalid_session' });
    }
}

function parseCookies(cookieHeader) {
    return cookieHeader.split(';').reduce((acc, part) => {
        const [key, ...val] = part.trim().split('=');
        if (key) acc[key.trim()] = decodeURIComponent(val.join('='));
        return acc;
    }, {});
}
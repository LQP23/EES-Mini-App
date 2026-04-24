// api/auth/callback.js
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export default async function handler(req, res) {
    const { code, state, error, error_description } = req.query;

    // Step 2: Handle Error from SSO
    if (error) {
        return res.redirect(302, `/?sso_error=${error}`);
    }

    if (!code || !state) {
        return res.redirect(302, '/?sso_error=missing_params');
    }

    const cookies = parseCookies(req.headers.cookie || '');
    const savedState = cookies['oauth_state'];
    const savedNonce = cookies['oauth_nonce'];

    // Step 2: Verify State to prevent CSRF
    if (state !== savedState) {
        return res.redirect(302, '/?sso_error=invalid_state');
    }

    try {
        // Step 3: Token Exchange
        // Sử dụng Method 2: client_secret_basic (Recommended trong tài liệu)
        const credentials = Buffer.from(`${process.env.GHN_SSO_CLIENT_ID}:${process.env.GHN_SSO_CLIENT_SECRET}`).toString('base64');

        const tokenResponse = await fetch('https://dev-online-gateway.ghn.vn/sso-v2/public-api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.GHN_SSO_REDIRECT_URI,
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const { access_token, id_token } = tokenData;

        // Step 4: Token Verification (Bắt buộc theo tài liệu)
        const client = jwksClient({
            jwksUri: 'https://dev-online-gateway.ghn.vn/sso-v2/public-api/oauth2/jwks'
        });

        const getKey = (header, callback) => {
            client.getSigningKey(header.kid, (err, key) => {
                const signingKey = key?.publicKey || key?.rsaPublicKey;
                callback(null, signingKey);
            });
        };

        const decodedIdToken = await new Promise((resolve, reject) => {
            jwt.verify(id_token, getKey, {
                issuer: 'https://dev-online-gateway.ghn.vn/sso-v2/public-api',
                audience: process.env.GHN_SSO_CLIENT_ID,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) reject(err);
                resolve(decoded);
            });
        });

        // Verify Nonce to prevent Replay Attacks
        if (decodedIdToken.nonce !== savedNonce) {
            throw new Error('invalid_nonce');
        }

        // Step 5: Get User Info (Optional nhưng cần thiết để lấy team, jobtitle...)
        const userResponse = await fetch('https://dev-online-gateway.ghn.vn/sso-v2/public-api/oauth2/userinfo', {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        const userInfo = await userResponse.json();

        // Step 6: Create Local Session
        const sessionPayload = {
            id_token: id_token, // Rất quan trọng để gửi lên lúc logout
            issued_at: Date.now(),
            ...userInfo
        };

        // Mã hóa Base64 cho session
        const sessionRaw = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

        // Thiết lập Cookie cho Session
        const sessionCookie = [
            `ghn_ees_session=${sessionRaw}`,
            'HttpOnly',
            'Secure',
            'SameSite=Lax',
            'Path=/',
            `Domain=${process.env.GHN_COOKIE_DOMAIN || '.ghn.vn'}`,
            'Max-Age=604800' // 7 ngày
        ].join('; ');

        // Xóa cookie bảo mật tạm thời (state, nonce)
        const clearState = 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
        const clearNonce = 'oauth_nonce=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

        res.setHeader('Set-Cookie', [sessionCookie, clearState, clearNonce]);

        // Hoàn tất đăng nhập, quay về trang chủ
        return res.redirect(302, '/');

    } catch (err) {
        console.error('SSO Callback Error:', err.message);
        return res.redirect(302, `/?sso_error=token_exchange_failed`);
    }
}

// Hàm hỗ trợ parse Cookie
function parseCookies(cookieHeader) {
    return cookieHeader.split(';').reduce((acc, part) => {
        const [key, ...val] = part.trim().split('=');
        if (key) acc[key.trim()] = decodeURIComponent(val.join('='));
        return acc;
    }, {});
}
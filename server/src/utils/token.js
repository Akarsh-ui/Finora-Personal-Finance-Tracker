import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'finora_dev_jwt_secret_fallback_key_2026';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    console.warn('[Auth] Warning: JWT_SECRET is not set in environment variables. Using fallback key.');
    return DEFAULT_SECRET;
  }
  return secret;
}

/**
 * Sign JWT token for user payload
 */
export function generateToken(user) {
  const secret = getSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    secret,
    { expiresIn }
  );
}

/**
 * Verify JWT token string
 */
export function verifyToken(token) {
  const secret = getSecret();
  return jwt.verify(token, secret);
}

/**
 * Set HttpOnly auth cookie with cross-site preview iframe compatibility
 */
export function setAuthCookie(res, token) {
  const isHttps =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.APP_URL && process.env.APP_URL.startsWith('https://')) ||
    Boolean(process.env.CSP_HEADER_VALUE);

  // 1 day expiration (24 hours in milliseconds) to match JWT_EXPIRES_IN=1d
  res.cookie('token', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/**
 * Clear HttpOnly auth cookie
 */
export function clearAuthCookie(res) {
  const isHttps =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.APP_URL && process.env.APP_URL.startsWith('https://')) ||
    Boolean(process.env.CSP_HEADER_VALUE);

  res.cookie('token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
}

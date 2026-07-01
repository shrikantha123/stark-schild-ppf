const crypto = require('crypto');
const { generateToken } = require('../utils/auth');

// Brute-force protection: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';

  if (!checkLoginRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Too many login attempts. Please wait 15 minutes.' })
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Request body is required' })
      };
    }

    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Username and password are required' })
      };
    }

    const validUser = process.env.ADMIN_USER;
    const validPass = process.env.ADMIN_PASSWORD;

    if (!validUser || !validPass) {
      console.error('ADMIN_USER or ADMIN_PASSWORD not set in environment.');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Server configuration error' })
      };
    }

    // Use crypto.timingSafeEqual on SHA-256 hashes to guarantee strict 32-byte constant-time comparison
    const userHash = crypto.createHash('sha256').update(username).digest();
    const validUserHash = crypto.createHash('sha256').update(validUser).digest();
    const passHash = crypto.createHash('sha256').update(password).digest();
    const validPassHash = crypto.createHash('sha256').update(validPass).digest();

    const usernameMatch = crypto.timingSafeEqual(userHash, validUserHash);
    const passwordMatch = crypto.timingSafeEqual(passHash, validPassHash);

    if (usernameMatch && passwordMatch) {
      const token = generateToken();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, token })
      };
    }

    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Invalid credentials' })
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Invalid request body' })
    };
  }
};

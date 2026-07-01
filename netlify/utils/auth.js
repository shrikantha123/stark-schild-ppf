const jwt = require('jsonwebtoken');

// Use dedicated JWT_SECRET, never reuse admin password
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

function generateToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(event) {
  const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin';
  } catch {
    return false;
  }
}

module.exports = { generateToken, verifyToken };

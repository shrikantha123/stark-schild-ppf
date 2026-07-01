/**
 * PPF Backend API Test Suite
 * Tests all Netlify function handlers directly without going through HTTP
 * Requires a .env file in project root with valid credentials
 */
require('dotenv').config();

// ─── Admin Login ────────────────────────────────────────────────────────────

describe('admin-login', () => {
  let handler;
  beforeAll(() => {
    handler = require('../netlify/functions/admin-login').handler;
  });

  function makeEvent(body) {
    return {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : null,
      queryStringParameters: null
    };
  }

  test('returns 405 for non-POST requests', async () => {
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 400 when body is missing', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {}, body: null });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when username or password is missing', async () => {
    const res = await handler(makeEvent({ username: 'shark123' }));
    expect(res.statusCode).toBe(400);
  });

  test('returns 401 for invalid credentials', async () => {
    const res = await handler(makeEvent({ username: 'wrong', password: 'wrong' }));
    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(false);
  });

  test('returns 200 with token for valid credentials', async () => {
    const res = await handler(makeEvent({
      username: process.env.ADMIN_USER,
      password: process.env.ADMIN_PASSWORD
    }));
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
    expect(typeof data.token).toBe('string');
  });
});

// ─── Auth Utils ─────────────────────────────────────────────────────────────

describe('auth utils', () => {
  const { generateToken, verifyToken } = require('../netlify/utils/auth');

  test('generateToken returns a JWT string', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('verifyToken returns true with valid bearer token', () => {
    const token = generateToken();
    const event = {
      headers: { authorization: `Bearer ${token}` }
    };
    expect(verifyToken(event)).toBe(true);
  });

  test('verifyToken returns false with missing header', () => {
    expect(verifyToken({ headers: {} })).toBe(false);
  });

  test('verifyToken returns false with malformed token', () => {
    const event = { headers: { authorization: 'Bearer invalid.token.here' } };
    expect(verifyToken(event)).toBe(false);
  });

  test('verifyToken returns false with no Bearer prefix', () => {
    const token = generateToken();
    const event = { headers: { authorization: token } };
    expect(verifyToken(event)).toBe(false);
  });
});

// ─── Get Customers ──────────────────────────────────────────────────────────

describe('get-customers', () => {
  let handler;
  const { generateToken } = require('../netlify/utils/auth');
  let validToken;

  beforeAll(() => {
    handler = require('../netlify/functions/get-customers').handler;
    validToken = generateToken();
  });

  function makeEvent(overrides = {}) {
    return {
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validToken}` },
      body: null,
      queryStringParameters: null,
      ...overrides
    };
  }

  test('returns 405 for non-GET requests', async () => {
    const res = await handler({ httpMethod: 'POST', headers: { authorization: `Bearer ${validToken}` }, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 401 without auth token', async () => {
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(401);
  });

  test('returns 200 and paginated data with valid token', async () => {
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.page).toBe(1);
    expect(typeof data.pagination.total).toBe('number');
  });

  test('pagination limit is respected', async () => {
    const res = await handler(makeEvent({ queryStringParameters: { page: '1', limit: '2' } }));
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.data.length).toBeLessThanOrEqual(2);
  });

  test('search parameter filters results', async () => {
    const res = await handler(makeEvent({ queryStringParameters: { search: 'nonexistent_xyz_12345' } }));
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.data.length).toBe(0);
  });

  test('response data has expected camelCase fields', async () => {
    const res = await handler(makeEvent());
    const data = JSON.parse(res.body);
    if (data.data.length > 0) {
      const first = data.data[0];
      expect(first).toHaveProperty('customerName');
      expect(first).toHaveProperty('registrationNumber');
      expect(first).toHaveProperty('email');
    }
  });
});

// ─── Send OTP ───────────────────────────────────────────────────────────────

describe('send-otp', () => {
  let handler;

  beforeAll(() => {
    handler = require('../netlify/functions/send-otp').handler;
  });

  function makeEvent(body) {
    return {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : null,
      queryStringParameters: null
    };
  }

  test('returns 405 for non-POST requests', async () => {
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 400 when body is missing', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {}, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when registrationNumber is missing', async () => {
    const res = await handler(makeEvent({ email: 'test@test.com' }));
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when email is missing', async () => {
    const res = await handler(makeEvent({ registrationNumber: '999' }));
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 for non-existent customer', async () => {
    const res = await handler(makeEvent({ registrationNumber: 'NONEXISTENT_99999', email: 'nobody@nowhere.com' }));
    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(false);
  });
});

// ─── Verify OTP ─────────────────────────────────────────────────────────────

describe('verify-otp', () => {
  let handler;

  beforeAll(() => {
    handler = require('../netlify/functions/verify-otp').handler;
  });

  function makeEvent(body) {
    return {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : null,
      queryStringParameters: null
    };
  }

  test('returns 405 for non-POST requests', async () => {
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 400 when body is missing', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {}, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when fields are missing', async () => {
    const res = await handler(makeEvent({ registrationNumber: '123', email: 'test@test.com' }));
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for invalid OTP format (not 6 digits)', async () => {
    const res = await handler(makeEvent({ registrationNumber: '123', email: 'test@test.com', otp: '123' }));
    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res.body);
    expect(data.message).toMatch(/6-digit/i);
  });

  test('returns 401 for wrong OTP', async () => {
    const res = await handler(makeEvent({ registrationNumber: '99999', email: 'nobody@test.com', otp: '000000' }));
    expect(res.statusCode).toBe(401);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(false);
  });
});

// ─── Add Customer ───────────────────────────────────────────────────────────

describe('add-customer', () => {
  let handler;
  const { generateToken } = require('../netlify/utils/auth');
  let validToken;

  beforeAll(() => {
    handler = require('../netlify/functions/add-customer').handler;
    validToken = generateToken();
  });

  function makeEvent(body) {
    return {
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${validToken}`, 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : null,
      queryStringParameters: null
    };
  }

  test('returns 405 for non-POST requests', async () => {
    const res = await handler({ httpMethod: 'GET', headers: { authorization: `Bearer ${validToken}` }, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 401 without auth token', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({}), queryStringParameters: null });
    expect(res.statusCode).toBe(401);
  });

  test('returns 400 when required fields missing', async () => {
    const res = await handler(makeEvent({ email: 'test@test.com' }));
    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(false);
  });

  test('returns 400 when body is missing', async () => {
    const res = await handler({ httpMethod: 'POST', headers: { authorization: `Bearer ${validToken}` }, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(400);
  });
});

// ─── Delete Customer ─────────────────────────────────────────────────────────

describe('delete-customer', () => {
  let handler;
  const { generateToken } = require('../netlify/utils/auth');
  let validToken;

  beforeAll(() => {
    handler = require('../netlify/functions/delete-customer').handler;
    validToken = generateToken();
  });

  function makeEvent(body) {
    return {
      httpMethod: 'DELETE',
      headers: { authorization: `Bearer ${validToken}`, 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : null,
      queryStringParameters: null
    };
  }

  test('returns 405 for non-DELETE requests', async () => {
    const res = await handler({ httpMethod: 'GET', headers: { authorization: `Bearer ${validToken}` }, body: null, queryStringParameters: null });
    expect(res.statusCode).toBe(405);
  });

  test('returns 401 without auth token', async () => {
    const res = await handler({ httpMethod: 'DELETE', headers: {}, body: JSON.stringify({ registrationNumber: 'test' }), queryStringParameters: null });
    expect(res.statusCode).toBe(401);
  });

  test('returns 400 when registrationNumber is missing', async () => {
    const res = await handler(makeEvent({}));
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 for non-existent registration number', async () => {
    const res = await handler(makeEvent({ registrationNumber: 'NONEXISTENT_XYZ_99999' }));
    expect(res.statusCode).toBe(404);
    const data = JSON.parse(res.body);
    expect(data.success).toBe(false);
  });
});

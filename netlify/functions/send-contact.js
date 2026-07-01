const { sendContactEmail } = require('../utils/email');

// Rate limiting: Max 3 requests per IP per hour
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) {
    return false;
  }
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

  try {
    const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Too many messages sent. Please try again later.' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Request body is required' })
      };
    }

    const { name, email, phone, message } = JSON.parse(event.body);

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Name, email, and message are required' })
      };
    }

    // Send the email
    const emailResult = await sendContactEmail(name.trim(), email.trim(), phone ? phone.trim() : '', message.trim());

    if (!emailResult.success) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Failed to send message. Please try again later.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Message sent successfully!' })
    };

  } catch (error) {
    console.error('Contact form error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

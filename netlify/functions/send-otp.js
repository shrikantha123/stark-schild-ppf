const { getSupabase } = require('../utils/supabase');
const { sendOtpEmail } = require('../utils/email');
const crypto = require('crypto');

// Simple in-memory rate limiter: max 3 OTP requests per email per 10 minutes
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 3;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Request body is required' })
      };
    }

    const { registrationNumber, email } = JSON.parse(event.body);

    if (!registrationNumber || !email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'registrationNumber and email are required' })
      };
    }

    const cleanReg = registrationNumber.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Rate limiting check
    const rateLimitKey = `${cleanEmail}:${cleanReg}`;
    if (!checkRateLimit(rateLimitKey)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Too many OTP requests. Please wait 10 minutes before trying again.' })
      };
    }

    const supabase = getSupabase();

    // Escape Supabase ilike wildcard characters to prevent injection
    const escapedReg = cleanReg.replace(/[%_\\]/g, '\\$&');
    const escapedEmail = cleanEmail.replace(/[%_\\]/g, '\\$&');

    // Validate customer exists with exact (case-insensitive) match
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .ilike('registration_number', escapedReg)
      .ilike('email', escapedEmail)
      .maybeSingle();

    if (!customer) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Customer not found. Please check your registration number and email.' })
      };
    }

    // Clean up old/expired OTPs for this user before creating a new one
    await supabase
      .from('otps')
      .delete()
      .eq('registration_number', cleanReg.toLowerCase())
      .eq('email', cleanEmail)
      .or('used.eq.true,expires_at.lt.' + new Date().toISOString());

    // Generate 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store OTP in Supabase
    const { error: otpError } = await supabase.from('otps').insert([{
      registration_number: cleanReg.toLowerCase(),
      email: cleanEmail,
      otp: otpCode,
      expires_at: expiresAt,
      used: false
    }]);

    if (otpError) throw otpError;

    // Send OTP email via Brevo
    const emailResult = await sendOtpEmail(cleanEmail, otpCode);

    if (!emailResult.success) {
      // If email fails, remove the stored OTP to keep DB clean
      await supabase.from('otps').delete()
        .eq('registration_number', cleanReg.toLowerCase())
        .eq('otp', otpCode);

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Failed to send OTP email. Please try again.' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'OTP sent successfully' })
    };
  } catch (error) {
    console.error('Send OTP error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

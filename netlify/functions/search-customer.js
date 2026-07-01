const { getSupabase } = require('../utils/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  try {
    // Null body check
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

    // Sanitize inputs
    const cleanReg = registrationNumber.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Escape Supabase ilike wildcard characters to prevent injection
    const escapedReg = cleanReg.replace(/[%_\\]/g, '\\$&');
    const escapedEmail = cleanEmail.replace(/[%_\\]/g, '\\$&');

    const supabase = getSupabase();

    // Use maybeSingle() instead of single() to avoid crashes on 0 results
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id')
      .ilike('registration_number', escapedReg)
      .ilike('email', escapedEmail)
      .maybeSingle();

    if (error) throw error;

    if (!customer) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Customer not found or details do not match' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Customer found. You can now request an OTP.' })
    };
  } catch (error) {
    console.error('Search customer error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

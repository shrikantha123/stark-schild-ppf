const { getSupabase } = require('../utils/supabase');

// Only expose safe, non-sensitive fields to the customer portal
const SAFE_FIELDS = [
  'customer_name', 'vehicle_model', 'registration_number',
  'ppf_brand', 'coverage_type', 'installation_date',
  'warranty_years', 'warranty_end_date', 'dealer_name'
];

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

    const { registrationNumber, email, otp } = JSON.parse(event.body);

    if (!registrationNumber || !email || !otp) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'registrationNumber, email, and otp are required' })
      };
    }

    // Validate OTP is exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'OTP must be a 6-digit number' })
      };
    }

    const cleanReg = registrationNumber.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const supabase = getSupabase();

    // Find valid, unused, non-expired OTP using maybeSingle to avoid throws
    const { data: validOtp, error: otpError } = await supabase
      .from('otps')
      .select('id')
      .eq('registration_number', cleanReg)
      .eq('email', cleanEmail)
      .eq('otp', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) throw otpError;

    if (!validOtp) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Invalid or expired OTP. Please request a new one.' })
      };
    }

    // Mark OTP as used immediately to prevent replay attacks
    const { error: markError } = await supabase
      .from('otps')
      .update({ used: true })
      .eq('id', validOtp.id);

    if (markError) throw markError;

    // Fetch only safe customer data (no phone, internal notes exposed)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(SAFE_FIELDS.join(', '))
      .ilike('registration_number', registrationNumber.trim())
      .ilike('email', email.trim())
      .maybeSingle();

    if (customerError) throw customerError;

    if (!customer) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Customer data not found' })
      };
    }

    const safeData = {
      customerName: customer.customer_name,
      vehicleModel: customer.vehicle_model,
      registrationNumber: customer.registration_number,
      ppfBrand: customer.ppf_brand,
      coverageType: customer.coverage_type,
      installationDate: customer.installation_date,
      warrantyYears: customer.warranty_years,
      warrantyEndDate: customer.warranty_end_date,
      dealerName: customer.dealer_name
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, data: safeData })
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

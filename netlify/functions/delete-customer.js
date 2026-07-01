const { verifyToken } = require('../utils/auth');
const { getSupabase } = require('../utils/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' })
    };
  }

  if (!verifyToken(event)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Unauthorized' })
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

    const { registrationNumber } = JSON.parse(event.body);

    if (!registrationNumber) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'registrationNumber is required' })
      };
    }

    const supabase = getSupabase();

    // Confirm customer exists before deleting
    const { data: existing, error: findError } = await supabase
      .from('customers')
      .select('id')
      .eq('registration_number', registrationNumber.trim())
      .maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Customer not found' })
      };
    }

    // Delete by id (safer than by reg number)
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;

    // Also clean up any OTPs associated with this registration
    await supabase
      .from('otps')
      .delete()
      .eq('registration_number', registrationNumber.trim().toLowerCase());

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Customer deleted successfully' })
    };
  } catch (error) {
    console.error('Delete customer error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

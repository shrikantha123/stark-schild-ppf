const { verifyToken } = require('../utils/auth');
const { getSupabase } = require('../utils/supabase');

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
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

    const data = JSON.parse(event.body);
    const { registrationNumber, email, customerName } = data;

    if (!registrationNumber || !email || !customerName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'registrationNumber, email, and customerName are required' })
      };
    }

    const supabase = getSupabase();

    // Check if registration number already exists
    const { data: existing, error: checkError } = await supabase
      .from('customers')
      .select('id')
      .eq('registration_number', registrationNumber.trim())
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Registration number already exists' })
      };
    }

    // Insert new customer
    const { error } = await supabase.from('customers').insert([{
      id: crypto.randomUUID(),
      customer_name: customerName.trim(),
      email: email.trim().toLowerCase(),
      phone: data.phone ? data.phone.trim() : '',
      registration_number: registrationNumber.trim(),
      vehicle_model: data.vehicleModel ? data.vehicleModel.trim() : '',
      ppf_brand: data.ppfBrand ? data.ppfBrand.trim() : '',
      coverage_type: data.coverageType ? data.coverageType.trim() : '',
      installation_date: data.installationDate || null,
      warranty_years: data.warrantyYears ? parseInt(data.warrantyYears, 10) : null,
      warranty_end_date: data.warrantyEndDate || null,
      dealer_name: data.dealerName ? data.dealerName.trim() : '',
      invoice_number: data.invoiceNumber ? data.invoiceNumber.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
    }]);

    if (error) throw error;

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Customer added successfully' })
    };
  } catch (error) {
    console.error('Add customer error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: error.message || 'Internal Server Error', stack: error.stack })
    };
  }
};

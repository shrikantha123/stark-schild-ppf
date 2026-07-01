const { verifyToken } = require('../utils/auth');
const { getSupabase } = require('../utils/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
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
    const { id, oldRegistrationNumber, registrationNumber } = data;

    if (!registrationNumber) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'registrationNumber is required' })
      };
    }

    const supabase = getSupabase();

    // Find the customer by id or oldRegistrationNumber
    let query = supabase.from('customers').select('id, email');
    if (id) {
      query = query.eq('id', id);
    } else if (oldRegistrationNumber) {
      query = query.eq('registration_number', oldRegistrationNumber.trim());
    } else {
      query = query.eq('registration_number', registrationNumber.trim());
    }

    const { data: existing, error: findError } = await query.maybeSingle();

    if (findError) throw findError;

    if (!existing) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Customer not found' })
      };
    }

    // If reg number changed, check new one is not already taken by another record
    if (oldRegistrationNumber && oldRegistrationNumber !== registrationNumber) {
      const { data: conflict, error: conflictError } = await supabase
        .from('customers')
        .select('id')
        .eq('registration_number', registrationNumber.trim())
        .neq('id', existing.id)
        .maybeSingle();

      if (conflictError) throw conflictError;

      if (conflict) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: false, message: 'New registration number is already in use by another customer' })
        };
      }
    }

    // Update the row
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        customer_name: data.customerName ? data.customerName.trim() : '',
        email: data.email ? data.email.trim().toLowerCase() : existing.email,
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
      })
      .eq('id', existing.id);

    if (updateError) throw updateError;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, message: 'Customer updated successfully' })
    };
  } catch (error) {
    console.error('Update customer error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

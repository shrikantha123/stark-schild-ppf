const { verifyToken } = require('../utils/auth');
const { getSupabase } = require('../utils/supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
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
    // Server-side pagination and search
    const params = event.queryStringParameters || {};
    const page = Math.max(1, parseInt(params.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 20));
    const search = (params.search || '').trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = getSupabase();

    // Escape Supabase ilike wildcard characters to prevent injection
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');

    let q = supabase
      .from('customers')
      .select('id, customer_name, email, phone, registration_number, vehicle_model, ppf_brand, coverage_type, installation_date, warranty_years, warranty_end_date, dealer_name, invoice_number, notes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Server-side search across reg number, email, and name
    if (escapedSearch) {
      q = q.or(
        `registration_number.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%,customer_name.ilike.%${escapedSearch}%`
      );
    }

    const { data: customers, error, count } = await q;

    if (error) throw error;

    const mapped = (customers || []).map(c => ({
      id: c.id,
      customerName: c.customer_name,
      email: c.email,
      phone: c.phone,
      registrationNumber: c.registration_number,
      vehicleModel: c.vehicle_model,
      ppfBrand: c.ppf_brand,
      coverageType: c.coverage_type,
      installationDate: c.installation_date,
      warrantyYears: c.warranty_years,
      warrantyEndDate: c.warranty_end_date,
      dealerName: c.dealer_name,
      invoiceNumber: c.invoice_number,
      notes: c.notes,
      createdAt: c.created_at,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: mapped,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    };
  } catch (error) {
    console.error('Get customers error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Internal Server Error' })
    };
  }
};

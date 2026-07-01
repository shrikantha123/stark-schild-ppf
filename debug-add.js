const { getSupabase } = require('./netlify/utils/supabase');
const crypto = require('crypto');
require('dotenv').config();

async function testAdd() {
  const supabase = getSupabase();
  const testReg = `TEST-${Date.now()}`;
  
  console.log('Testing insert...');
  const result = await supabase.from('customers').insert([{
    id: crypto.randomUUID(),
    customer_name: 'Test Customer',
    email: `test${Date.now()}@example.com`,
    phone: '1234567890',
    registration_number: testReg,
    vehicle_model: 'Test Model',
    ppf_brand: 'Test Brand',
    coverage_type: 'Test Coverage',
    installation_date: null,
    warranty_years: null,
    warranty_end_date: null,
    dealer_name: 'Test Dealer',
    invoice_number: '12345',
    notes: 'Test Notes'
  }]);
  
  console.log('Insert result:', JSON.stringify(result, null, 2));

  console.log('\nTesting select with count...');
  const getResult = await supabase
        .from('customers')
        .select('id', { count: 'exact' });
  console.log('Select result:', JSON.stringify({ data: getResult.data?.length, error: getResult.error, count: getResult.count }, null, 2));
}

testAdd().catch(console.error);

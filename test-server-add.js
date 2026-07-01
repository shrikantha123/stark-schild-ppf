require('dotenv').config();
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/.netlify/functions/add-customer',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + require('./netlify/utils/auth').generateToken()
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({
  registrationNumber: 'SRVR-' + Date.now(),
  customerName: 'Server Test',
  email: 'server' + Date.now() + '@test.com'
}));
req.end();

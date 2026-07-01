const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

let cachedConnection = null;

async function getDoc() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

  await doc.loadInfo();
  
  // Ensure "Customers" sheet exists
  let customersSheet = doc.sheetsByTitle['Customers'];
  if (!customersSheet) {
    customersSheet = await doc.addSheet({
      title: 'Customers',
      headerValues: [
        'id', 'customerName', 'email', 'phone', 'registrationNumber',
        'vehicleModel', 'ppfBrand', 'coverageType', 'installationDate',
        'warrantyYears', 'warrantyEndDate', 'dealerName', 'invoiceNumber',
        'notes', 'createdAt'
      ]
    });
  } else {
    // Just ensure headers are loaded/exist
    try {
      await customersSheet.loadHeaderRow();
    } catch (e) {
      await customersSheet.setHeaderRow([
        'id', 'customerName', 'email', 'phone', 'registrationNumber',
        'vehicleModel', 'ppfBrand', 'coverageType', 'installationDate',
        'warrantyYears', 'warrantyEndDate', 'dealerName', 'invoiceNumber',
        'notes', 'createdAt'
      ]);
    }
  }

  // Ensure "OTPs" sheet exists
  let otpsSheet = doc.sheetsByTitle['OTPs'];
  if (!otpsSheet) {
    otpsSheet = await doc.addSheet({
      title: 'OTPs',
      headerValues: ['registrationNumber', 'email', 'otp', 'expiresAt', 'used']
    });
  } else {
    try {
      await otpsSheet.loadHeaderRow();
    } catch (e) {
      await otpsSheet.setHeaderRow(['registrationNumber', 'email', 'otp', 'expiresAt', 'used']);
    }
  }

  cachedConnection = { doc, customersSheet, otpsSheet };
  return cachedConnection;
}

module.exports = { getDoc };

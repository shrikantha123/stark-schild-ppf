const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the current directory (for admin.html and index.html)
app.use(express.static(__dirname));

// Mock the Netlify functions routing
app.all('/.netlify/functions/:name', async (req, res) => {
  const funcName = req.params.name;
  console.log(`\n📥 [${new Date().toISOString()}] ${req.method} → /${funcName}`);
  if (req.body && Object.keys(req.body).length) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.otp) safeBody.otp = '***';
    console.log(`   Body: ${JSON.stringify(safeBody)}`);
  }

  const funcPath = path.join(__dirname, 'netlify', 'functions', `${funcName}.js`);

  if (fs.existsSync(funcPath)) {
    try {
      // Clear require cache so we don't have to restart server on every edit
      delete require.cache[require.resolve(funcPath)];

      // Also clear all utility modules so edits to auth.js, email.js, supabase.js etc. are picked up
      const utilsDir = path.join(__dirname, 'netlify', 'utils');
      Object.keys(require.cache)
        .filter(k => k.startsWith(utilsDir))
        .forEach(k => delete require.cache[k]);

      const handler = require(funcPath).handler;

      // Build event matching Netlify Lambda format
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        path: req.path,
        queryStringParameters: Object.keys(req.query).length ? req.query : null,
        rawQuery: req.url.includes('?') ? req.url.split('?')[1] : '',
        body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
      };

      const response = await handler(event, {});
      const preview = response.body && response.body.length > 300
        ? response.body.substring(0, 300) + '...'
        : response.body;
      console.log(`   ✅ Response ${response.statusCode}: ${preview}`);
      res.status(response.statusCode || 200)
        .set(response.headers || { 'Content-Type': 'application/json' })
        .send(response.body);
    } catch (error) {
      console.error(`   ❌ Function ${funcName} crashed:`, error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(404).json({ success: false, message: `Function '${funcName}' not found` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 RELIABLE DEV SERVER READY!`);
  console.log(`👉 Open: http://localhost:${PORT}/admin.html`);
  console.log(`=================================================\n`);
});

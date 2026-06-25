const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sales?sellerId=6a3bd7d6286cb84c196874e0',
  method: 'GET',
  headers: {
    // We need an admin token to fetch sales.
    // Let's just generate a valid token for admin!
  }
};

// Actually, generating a token is hard without the JWT secret.
// Let's just read the JWT_SECRET from .env and generate a token!
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });

const token = jwt.sign({ userId: '6a3bd7d6286cb84c196874e0', role: 'admin' }, process.env.JWT_SECRET || 'supersecret123');

options.headers['Authorization'] = `Bearer ${token}`;

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("API Response Status:", res.statusCode);
    try {
       const json = JSON.parse(data);
       console.log("Sales count:", json.data.length);
       if (json.data.length > 0) {
          console.log("First sale commission:", json.data[0].commission);
       }
    } catch(e) {
       console.log("Parse error:", e);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();

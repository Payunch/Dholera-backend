const http = require('http');

const data = JSON.stringify({
  projectName: 'Sector 4 High-Rise',
  modelType: 'parking-planner',
  configurationData: { builtUpArea: 5000, requiredCars: 50, requiredTwoWheelers: 20 },
  LeadId: null,
  status: 'Draft'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/clearance/save',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response:', responseData);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

req.write(data);
req.end();

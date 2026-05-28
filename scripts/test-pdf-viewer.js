const axios = require('axios');

async function testPdfView() {
  const baseUrl = 'http://localhost:3001/api';
  const token = 'test_token_123';
  const pdfId = 1;

  try {
    console.log(`Testing PDF view for ID ${pdfId} with token ${token}...`);
    const response = await axios.get(`${baseUrl}/pdf/view/${pdfId}?token=${token}`, {
      responseType: 'arraybuffer'
    });
    console.log('Response Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);
    console.log('Success!');
  } catch (error) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', Buffer.from(error.response.data).toString());
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPdfView();

const axios = require('axios');

async function testConnection() {
  try {
    console.log('Testing connection to remote server...');
    const response = await axios.get('https://backendhanout.onrender.com/api/users');
    console.log('✅ Server is responding!');
    console.log('Status:', response.status);
    console.log('Data length:', response.data ? response.data.length : 'N/A');
  } catch (error) {
    console.log('❌ Server connection failed:');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }
}

testConnection();
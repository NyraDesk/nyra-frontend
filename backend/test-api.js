// Test script per verificare le API del backend NYRA
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing NYRA Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');

    // Test 2: AI Test Connection
    console.log('2️⃣ Testing AI Connection...');
    const aiTestResponse = await fetch(`${BASE_URL}/api/ai/test`);
    const aiTestData = await aiTestResponse.json();
    console.log('✅ AI Test:', aiTestData);
    console.log('');

    // Test 3: AI Chat (senza autenticazione)
    console.log('3️⃣ Testing AI Chat...');
    const chatResponse = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Ciao, dimmi solo "OK" per testare la connessione.' }
        ]
      })
    });
    const chatData = await chatResponse.json();
    console.log('✅ AI Chat:', chatData);
    console.log('');

    // Test 4: Email Generation
    console.log('4️⃣ Testing Email Generation...');
    const emailGenResponse = await fetch(`${BASE_URL}/api/email/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Genera una email di benvenuto per un nuovo cliente',
        emailType: 'standard'
      })
    });
    const emailGenData = await emailGenResponse.json();
    console.log('✅ Email Generation:', emailGenData);
    console.log('');

    // Test 5: Text Analysis
    console.log('5️⃣ Testing Text Analysis...');
    const analysisResponse = await fetch(`${BASE_URL}/api/ai/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Questo è un testo di test per verificare l\'analisi del sentiment.',
        analysisType: 'sentiment'
      })
    });
    const analysisData = await analysisResponse.json();
    console.log('✅ Text Analysis:', analysisData);
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running:');
      console.log('   cd backend && npm run dev');
    }
  }
}

// Run tests
testAPI();

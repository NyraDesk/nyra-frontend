const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
    console.log('🚀 Starting Excel upload test...\n');
    
    const form = new FormData();
    
    // Verifica che il file esista
    const filePath = './Progetti_Clienti_17570814950501.xlsx';
    if (!fs.existsSync(filePath)) {
        console.log('❌ File Excel non trovato! Assicurati che sia nella cartella backend');
        return;
    }
    
    form.append('file', fs.createReadStream(filePath));
    
    try {
        const response = await axios.post(
            'https://nyra-backend-c7zi.onrender.com/api/excel/upload',
            form,
            {
                headers: form.getHeaders()
            }
        );
        
        console.log('✅ UPLOAD SUCCESS!');
        console.log('📊 File details:');
        console.log('  - FileID:', response.data.fileId);
        console.log('  - Records:', response.data.records);
        console.log('  - Columns:', response.data.columns);
        console.log('\n💾 SAVE THIS ID FOR ANALYSIS TEST:', response.data.fileId);
        
        // Test automatico dell'analisi
        if (response.data.fileId) {
            console.log('\n🤖 Testing analysis endpoint...');
            await testAnalysis(response.data.fileId);
        }
        
    } catch (error) {
        console.log('❌ UPLOAD FAILED!');
        console.log('Error:', error.response?.data || error.message);
    }
}

async function testAnalysis(fileId) {
    try {
        const response = await axios.post(
            'https://nyra-backend-c7zi.onrender.com/api/excel/analyze',
            {
                fileId: fileId,
                query: "Analizza i dati e mostra statistiche principali"
            }
        );
        
        console.log('✅ ANALYSIS SUCCESS!');
        console.log('AI Response:', response.data.analysis);
        
    } catch (error) {
        console.log('❌ ANALYSIS FAILED!');
        console.log('Error:', error.response?.data || error.message);
    }
}

// Esegui test
testUpload();

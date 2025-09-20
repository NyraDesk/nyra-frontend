/**
 * Test Suite per NYRA Intent Analyzer
 * Verifica tutti i test cases richiesti
 */

const IntentAnalyzer = require('./services/intentAnalyzer');

// Inizializza l'analyzer
const analyzer = new IntentAnalyzer();

// Funzione di test
function runTest(testName, message, expectedIntent, minConfidence = 0.7, context = {}) {
  console.log(`\n🧪 TEST: ${testName}`);
  console.log(`📝 Messaggio: "${message}"`);
  
  const result = analyzer.analyze(message, context);
  
  console.log(`🎯 Intent rilevato: ${result.intent}`);
  console.log(`📊 Confidence: ${result.confidence}`);
  console.log(`✅ Azione suggerita: ${result.suggestedAction}`);
  console.log(`❓ Richiede conferma: ${result.requiresConfirmation}`);
  console.log(`💡 Hint contestuali: ${result.contextualHints.join(', ')}`);
  
  // Verifica risultati
  const intentMatch = result.intent === expectedIntent;
  const confidenceMatch = result.confidence >= minConfidence;
  
  if (intentMatch && confidenceMatch) {
    console.log(`✅ PASS - Intent corretto e confidence sufficiente`);
  } else {
    console.log(`❌ FAIL - Expected: ${expectedIntent} (min ${minConfidence}), Got: ${result.intent} (${result.confidence})`);
  }
  
  return { intentMatch, confidenceMatch, result };
}

// Test Cases richiesti
console.log('🚀 AVVIO TEST SUITE - NYRA Intent Analyzer');
console.log('=' * 50);

const testResults = [];

// TEST CASE 1: "Invia le email ai clienti" → SEND_EMAIL (0.95)
testResults.push(runTest(
  'Test Case 1: Invio Email',
  'Invia le email ai clienti',
  'SEND_EMAIL',
  0.95
));

// TEST CASE 2: "Analizza i dati di vendita" → ANALYZE_EXCEL (0.90)
testResults.push(runTest(
  'Test Case 2: Analisi Excel',
  'Analizza i dati di vendita',
  'ANALYZE_EXCEL',
  0.90
));

// TEST CASE 3: "Ciao come stai?" → GENERAL_CHAT (0.99)
testResults.push(runTest(
  'Test Case 3: Chat Generale',
  'Ciao come stai?',
  'GENERAL_CHAT',
  0.99
));

// TEST CASE 4: "Prepara un report" → ambiguo, confidence < 0.7, chiedi dettagli
testResults.push(runTest(
  'Test Case 4: Richiesta Ambigua',
  'Prepara un report',
  'GENERAL_CHAT', // Dovrebbe essere ambiguo
  0.0,
  {}
));

// TEST CASE 5: "Mail" da solo → NON deve triggerare nulla senza contesto
testResults.push(runTest(
  'Test Case 5: Parola Singola Senza Contesto',
  'Mail',
  'GENERAL_CHAT', // Dovrebbe essere generico
  0.0,
  {}
));

// Test aggiuntivi per verificare robustezza

// Test con contesto Excel
testResults.push(runTest(
  'Test Aggiuntivo: Email con Contesto Excel',
  'Invia le email',
  'SEND_EMAIL',
  0.8,
  { hasExcelData: true, hasEmailAddresses: true }
));

// Test per CREATE_EXCEL
testResults.push(runTest(
  'Test Aggiuntivo: Creazione Excel',
  'Crea un nuovo foglio Excel per il budget',
  'CREATE_EXCEL',
  0.85
));

// Test per PROCESS_DOCUMENT
testResults.push(runTest(
  'Test Aggiuntivo: Elaborazione Documento',
  'Analizza questo documento PDF',
  'PROCESS_DOCUMENT',
  0.8,
  { hasDocument: true }
));

// Test per messaggio complesso
testResults.push(runTest(
  'Test Aggiuntivo: Messaggio Complesso',
  'Invia una campagna email marketing ai clienti usando i dati del foglio Excel caricato',
  'SEND_EMAIL',
  0.9,
  { hasExcelData: true, hasEmailAddresses: true, hasTemplate: true }
));

// Test per messaggio di aiuto
testResults.push(runTest(
  'Test Aggiuntivo: Richiesta Aiuto',
  'Cosa puoi fare? Dimmi le tue funzionalità',
  'GENERAL_CHAT',
  0.95
));

// Test per analisi con numeri
testResults.push(runTest(
  'Test Aggiuntivo: Analisi con Numeri',
  'Analizza i dati delle vendite del 2023 e crea un grafico',
  'ANALYZE_EXCEL',
  0.85
));

// Test per creazione con dettagli specifici
testResults.push(runTest(
  'Test Aggiuntivo: Creazione Dettagliata',
  'Genera un template Excel per inventario con colonne: prodotto, quantità, prezzo, fornitore',
  'CREATE_EXCEL',
  0.9
));

// Test per elaborazione batch
testResults.push(runTest(
  'Test Aggiuntivo: Elaborazione Batch',
  'Processa tutti i documenti PDF nella cartella e estrai i dati',
  'PROCESS_DOCUMENT',
  0.8,
  { hasMultipleDocuments: true }
));

// Test per messaggio molto breve
testResults.push(runTest(
  'Test Aggiuntivo: Messaggio Breve',
  'Excel',
  'GENERAL_CHAT',
  0.0 // Dovrebbe avere confidence molto bassa
));

// Test per messaggio molto lungo
testResults.push(runTest(
  'Test Aggiuntivo: Messaggio Lungo',
  'Ciao, vorrei che tu analizzi i dati del foglio Excel che ho caricato ieri, che contiene le vendite del trimestre scorso, e che mi prepari un report dettagliato con grafici e statistiche per la riunione di domani alle 10',
  'ANALYZE_EXCEL',
  0.85,
  { hasExcelData: true, hasDateData: true }
));

console.log('\n' + '=' * 50);
console.log('📊 RISULTATI FINALI');
console.log('=' * 50);

// Calcola statistiche
const totalTests = testResults.length;
const passedTests = testResults.filter(t => t.intentMatch && t.confidenceMatch).length;
const failedTests = totalTests - passedTests;

console.log(`📈 Test Totali: ${totalTests}`);
console.log(`✅ Test Passati: ${passedTests}`);
console.log(`❌ Test Falliti: ${failedTests}`);
console.log(`📊 Percentuale Successo: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

// Mostra test falliti
const failedTestDetails = testResults
  .map((result, index) => ({ ...result, index }))
  .filter(t => !(t.intentMatch && t.confidenceMatch));

if (failedTestDetails.length > 0) {
  console.log('\n❌ TEST FALLITI:');
  failedTestDetails.forEach(test => {
    console.log(`   Test ${test.index + 1}: ${test.result.intent} (${test.result.confidence})`);
  });
}

// Test delle statistiche dell'analyzer
console.log('\n📊 STATISTICHE ANALYZER:');
const stats = analyzer.getIntentStats();
console.log(JSON.stringify(stats, null, 2));

// Test di estensibilità
console.log('\n🔧 TEST ESTENSIBILITÀ:');
analyzer.addIntent('CUSTOM_INTENT', {
  patterns: [/test.*custom/i],
  requiredContext: [],
  entities: ['custom', 'test'],
  contextBoosters: {},
  baseScore: 0.8
});

const customTest = analyzer.analyze('Test custom intent', {});
console.log(`Custom intent test: ${customTest.intent} (${customTest.confidence})`);

console.log('\n🎉 TEST SUITE COMPLETATA!');

// Esporta risultati per uso programmatico
module.exports = {
  testResults,
  totalTests,
  passedTests,
  failedTests,
  successRate: (passedTests / totalTests) * 100
};

import { sanitizeUrlInput, isValidUrl, sanitizeAndValidateUrl } from './urlSanitizer';

// Test cases for sanitizeUrlInput
const testCases = [
  // Single words
  { input: 'amazon', expected: 'https://www.amazon.com' },
  { input: 'google', expected: 'https://www.google.com' },
  { input: 'openai', expected: 'https://www.openai.com' },
  { input: 'github', expected: 'https://www.github.com' },
  
  // Domains with TLD
  { input: 'amazon.it', expected: 'https://amazon.it' },
  { input: 'google.com', expected: 'https://google.com' },
  { input: 'github.io', expected: 'https://github.io' },
  
  // With www prefix
  { input: 'www.google.com', expected: 'https://www.google.com' },
  { input: 'www.amazon.it', expected: 'https://www.amazon.it' },
  
  // Already valid URLs
  { input: 'http://github.com', expected: 'http://github.com' },
  { input: 'https://www.openai.com', expected: 'https://www.openai.com' },
  
  // Special cases
  { input: 'localhost', expected: 'https://localhost' },
  { input: '127.0.0.1', expected: 'https://127.0.0.1' },
  
  // Invalid inputs
  { input: 'amazon?.com', expected: null },
  { input: 'google com', expected: null },
  { input: '', expected: null },
  { input: '   ', expected: null },
  { input: null as any, expected: null },
  { input: undefined as any, expected: null },
];

// Test cases for isValidUrl
const urlValidationTests = [
  { input: 'https://www.google.com', expected: true },
  { input: 'http://localhost:3000', expected: true },
  { input: 'ftp://example.com', expected: true },
  { input: 'not-a-url', expected: false },
  { input: 'google com', expected: false },
  { input: '', expected: false },
];

console.log('🧪 Testing sanitizeUrlInput function...\n');

// Run tests
testCases.forEach(({ input, expected }, index) => {
  const result = sanitizeUrlInput(input);
  const passed = result === expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: "${input}"`);
  console.log(`  Expected: "${expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

console.log('🧪 Testing isValidUrl function...\n');

urlValidationTests.forEach(({ input, expected }, index) => {
  const result = isValidUrl(input);
  const passed = result === expected;
  
  console.log(`URL Validation Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: "${input}"`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Got: ${result}`);
  console.log('');
});

console.log('🧪 Testing sanitizeAndValidateUrl function...\n');

// Test the combined function
const combinedTests = [
  { input: 'amazon', expected: 'https://www.amazon.com' },
  { input: 'amazon?.com', expected: null },
  { input: 'https://www.google.com', expected: 'https://www.google.com' },
];

combinedTests.forEach(({ input, expected }, index) => {
  const result = sanitizeAndValidateUrl(input);
  const passed = result === expected;
  
  console.log(`Combined Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: "${input}"`);
  console.log(`  Expected: "${expected}"`);
  console.log(`  Got: "${result}"`);
  console.log('');
});

export { testCases, urlValidationTests, combinedTests }; 
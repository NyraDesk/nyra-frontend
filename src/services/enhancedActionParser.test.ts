import { enhancedActionParser } from './enhancedActionParser';

// Test cases for the enhanced action parser
const testCases = [
  // Valid messages
  {
    name: 'Valid search message',
    input: 'cerca iPhone su Amazon',
    expected: {
      type: 'universal_automation',
      action: 'search_on_site',
      confidence: 'high'
    }
  },
  {
    name: 'Train booking with context',
    input: 'treno da Roma a Milano',
    expected: {
      type: 'train_booking',
      action: 'book_train',
      confidence: 'high'
    }
  },
  {
    name: 'Phone search',
    input: 'trova iPhone 15',
    expected: {
      type: 'product_search',
      action: 'search_phone',
      confidence: 'high'
    }
  },
  {
    name: 'Open website',
    input: 'apri Google',
    expected: {
      type: 'universal_automation',
      action: 'navigate_only',
      confidence: 'medium'
    }
  },
  
  // Incomplete messages that need context
  {
    name: 'Incomplete train message',
    input: 'centrale va bene',
    expected: {
      type: 'incomplete_request',
      action: 'ask_clarification',
      confidence: 'medium'
    }
  },
  {
    name: 'Incomplete search',
    input: 'va bene',
    expected: {
      type: 'incomplete_request',
      action: 'ask_clarification',
      confidence: 'medium'
    }
  },
  
  // Invalid messages
  {
    name: 'Empty message',
    input: '',
    expected: null
  },
  {
    name: 'Null message',
    input: null,
    expected: null
  },
  {
    name: 'Undefined message',
    input: undefined,
    expected: null
  },
  {
    name: 'Non-string message',
    input: 123,
    expected: null
  },
  
  // Context completion tests
  {
    name: 'Context completion - train',
    input: 'apri trenitalia',
    expected: {
      type: 'context_completion',
      action: 'book_train',
      confidence: 'high'
    }
  }
];

console.log('🧪 Testing Enhanced Action Parser...\n');

// Test the parser
testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Input: "${testCase.input}"`);
  
  const result = enhancedActionParser.parseMessage(testCase.input, 'test-conversation');
  
  if (result === null && testCase.expected === null) {
    console.log('  ✅ PASS: Correctly returned null for invalid input');
  } else if (result && testCase.expected) {
    const typeMatch = result.type === testCase.expected.type;
    const actionMatch = result.action === testCase.expected.action;
    const confidenceMatch = result.confidence > 0.5 === (testCase.expected.confidence === 'high');
    
    if (typeMatch && actionMatch && confidenceMatch) {
      console.log('  ✅ PASS: Correctly parsed message');
      console.log(`    Type: ${result.type}`);
      console.log(`    Action: ${result.action}`);
      console.log(`    Confidence: ${result.confidence}`);
    } else {
      console.log('  ❌ FAIL: Incorrect parsing');
      console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`    Got: ${JSON.stringify(result)}`);
    }
  } else {
    console.log('  ❌ FAIL: Unexpected result');
    console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
    console.log(`    Got: ${JSON.stringify(result)}`);
  }
  
  console.log('');
});

// Test context management
console.log('🧪 Testing Context Management...\n');

// Test 1: Set context
enhancedActionParser.parseMessage('treno da Roma a Milano', 'context-test');
console.log('✅ Context set for train booking');

// Test 2: Complete with context
const contextResult = enhancedActionParser.parseMessage('apri trenitalia', 'context-test');
if (contextResult && contextResult.type === 'context_completion') {
  console.log('✅ Context completion working');
  console.log(`  Parameters: ${JSON.stringify(contextResult.parameters)}`);
} else {
  console.log('❌ Context completion failed');
}

// Test 3: Clear context
enhancedActionParser.clearContext('context-test');
const clearedResult = enhancedActionParser.parseMessage('apri trenitalia', 'context-test');
if (clearedResult && clearedResult.type !== 'context_completion') {
  console.log('✅ Context clearing working');
} else {
  console.log('❌ Context clearing failed');
}

console.log('');

// Test error handling
console.log('🧪 Testing Error Handling...\n');

const errorTests = [
  { input: '', description: 'Empty string' },
  { input: null, description: 'Null value' },
  { input: undefined, description: 'Undefined value' },
  { input: 123, description: 'Number' },
  { input: {}, description: 'Object' },
  { input: [], description: 'Array' }
];

errorTests.forEach((test, index) => {
  const result = enhancedActionParser.parseMessage(test.input);
  if (result === null) {
    console.log(`✅ Test ${index + 1}: ${test.description} - Correctly handled`);
  } else {
    console.log(`❌ Test ${index + 1}: ${test.description} - Should have returned null`);
  }
});

console.log('');

// Test execution
console.log('🧪 Testing Action Execution...\n');

const executionTests = [
  {
    name: 'Valid search action',
    action: {
      type: 'universal_automation',
      action: 'search_on_site',
      parameters: { query: 'iPhone', website: 'amazon.com' },
      confidence: 0.8
    }
  },
  {
    name: 'Invalid action',
    action: {
      type: 'invalid_type',
      action: 'invalid_action',
      parameters: {},
      confidence: 0.5
    }
  }
];

executionTests.forEach(async (test, index) => {
  console.log(`Execution Test ${index + 1}: ${test.name}`);
  const result = await enhancedActionParser.executeAction(test.action);
  console.log(`  Result: ${JSON.stringify(result)}`);
  console.log('');
});

export { testCases, errorTests, executionTests }; 
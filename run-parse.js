#!/usr/bin/env node

import { parseApiDocumentation } from './parse-docs.js';

console.log('Starting Tekla Open API documentation parsing...');

try {
  const result = await parseApiDocumentation();
  console.log('Parsing completed successfully!');
  console.log('Total items processed:', result.apiData.length);
} catch (error) {
  console.error('Parsing failed:', error.message);
  console.error(error.stack);
}
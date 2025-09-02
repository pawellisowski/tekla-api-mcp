#!/usr/bin/env node

import { TeklaApiDocumentation } from './src/tekla-api-documentation.js';

async function testServer() {
  console.log('Testing Tekla API MCP Server...\n');
  
  const docs = new TeklaApiDocumentation();
  
  // Test search functionality
  console.log('1. Testing search functionality...');
  try {
    const searchResults = await docs.search('Model', 'all', 5);
    console.log(`Found ${searchResults.length} results for "Model"`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.title} (${result.type})`);
    });
  } catch (error) {
    console.error('Search test failed:', error.message);
  }
  
  // Test class details
  console.log('\n2. Testing class details...');
  try {
    const classDetails = await docs.getClassDetails('Model');
    if (classDetails) {
      console.log(`Found class: ${classDetails.title}`);
      console.log(`Namespace: ${classDetails.namespace}`);
      console.log(`Description: ${classDetails.summary?.substring(0, 100)}...`);
    } else {
      console.log('No Model class found');
    }
  } catch (error) {
    console.error('Class details test failed:', error.message);
  }
  
  // Test namespaces
  console.log('\n3. Testing namespaces...');
  try {
    const namespaces = await docs.getNamespaces();
    console.log(`Found ${namespaces.length} namespaces:`);
    namespaces.slice(0, 5).forEach(ns => console.log(`  - ${ns}`));
  } catch (error) {
    console.error('Namespaces test failed:', error.message);
  }
  
  // Test statistics
  console.log('\n4. Testing statistics...');
  try {
    const stats = await docs.getStatistics();
    console.log('Documentation statistics:');
    console.log(`  Total items: ${stats.totalItems}`);
    console.log(`  Classes: ${stats.classes}`);
    console.log(`  Methods: ${stats.methods}`);
    console.log(`  Properties: ${stats.properties}`);
    console.log(`  Enums: ${stats.enums}`);
  } catch (error) {
    console.error('Statistics test failed:', error.message);
  }
  
  console.log('\nTests completed!');
}

testServer().catch(console.error);
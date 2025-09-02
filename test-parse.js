#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const TOC_FILE = './extracted-docs/TeklaOpenAPI_Reference.hhc';

console.log('Starting test parsing...');
console.log('TOC file exists:', fs.existsSync(TOC_FILE));

if (!fs.existsSync(TOC_FILE)) {
  console.error('TOC file not found at:', TOC_FILE);
  process.exit(1);
}

try {
  const tocContent = fs.readFileSync(TOC_FILE, 'utf-8');
  console.log('TOC file size:', tocContent.length, 'characters');
  
  const dom = new JSDOM(tocContent);
  const document = dom.window.document;
  
  const items = document.querySelectorAll('OBJECT[type="text/sitemap"]');
  console.log('Found', items.length, 'sitemap objects');
  
  // Parse first few items
  let count = 0;
  items.forEach((item, index) => {
    if (index < 10) {
      const nameParam = item.querySelector('param[name="Name"]');
      const localParam = item.querySelector('param[name="Local"]');
      
      if (nameParam && localParam) {
        const name = nameParam.getAttribute('value');
        const htmlFile = localParam.getAttribute('value');
        console.log(`${index + 1}. ${name} -> ${htmlFile}`);
        count++;
      }
    }
  });
  
  console.log('Successfully parsed', count, 'items');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
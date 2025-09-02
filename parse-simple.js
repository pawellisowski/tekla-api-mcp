#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const TOC_FILE = './extracted-docs/TeklaOpenAPI_Reference.hhc';
const HTML_DIR = './extracted-docs/html';
const OUTPUT_DIR = './parsed-api';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function determineItemType(name) {
  if (name === 'Tekla.Structures' || name.includes('Namespace')) return 'namespace';
  if (name.includes(' Class') && !name.includes(' Classes')) return 'class';
  if (name.includes(' Interface') && !name.includes(' Interfaces')) return 'interface';
  if (name.includes(' Enumeration') || name.includes(' Enum')) return 'enum';
  if (name.includes(' Properties') || name.includes(' Members')) return 'properties-collection';
  if (name.includes(' Methods')) return 'methods-collection';
  if (name.includes(' Property ')) return 'property';
  if (name.includes(' Method ') || name.includes(' Constructor ')) return 'method';
  if (name.includes(' Event ')) return 'event';
  if (name.includes(' Field ')) return 'field';
  if (name.includes(' Delegate ')) return 'delegate';
  return 'other';
}

function extractNamespace(name) {
  if (name.startsWith('Tekla.')) {
    const parts = name.split(' ');
    const namespacePart = parts[0];
    if (namespacePart.includes('.')) {
      return namespacePart;
    }
  }
  return '';
}

function parseSimpleHtml(filePath, tocItem) {
  try {
    const fullPath = path.join(HTML_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const htmlContent = fs.readFileSync(fullPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    const title = document.querySelector('title')?.textContent?.trim() || tocItem.name;
    const description = document.querySelector('meta[name="Description"]')?.getAttribute('content') || '';
    
    // Extract basic content without complex selectors
    const summaryElements = document.querySelectorAll('.summary, .introduction, .description, p');
    let summary = '';
    for (const el of summaryElements) {
      const text = el.textContent?.trim();
      if (text && text.length > summary.length && text.length < 500) {
        summary = text;
      }
    }

    return {
      title,
      description,
      summary,
      namespace: tocItem.namespace || extractNamespace(title),
      type: tocItem.type,
      level: tocItem.level,
      htmlFile: filePath
    };
    
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

async function parseSimpleApi() {
  console.log('Starting simple API parsing...');
  
  const tocContent = fs.readFileSync(TOC_FILE, 'utf-8');
  const dom = new JSDOM(tocContent);
  const document = dom.window.document;
  
  const tocStructure = [];
  const items = document.querySelectorAll('OBJECT[type="text/sitemap"]');
  
  console.log(`Found ${items.length} items in table of contents`);
  
  items.forEach(item => {
    const nameParam = item.querySelector('param[name="Name"]');
    const localParam = item.querySelector('param[name="Local"]');
    
    if (nameParam && localParam) {
      const name = nameParam.getAttribute('value');
      const htmlFile = localParam.getAttribute('value').replace('html/', '');
      
      let level = 0;
      let parent = item.parentElement;
      while (parent && parent.tagName === 'UL') {
        level++;
        parent = parent.parentElement;
      }
      
      tocStructure.push({
        name,
        htmlFile,
        level,
        type: determineItemType(name),
        namespace: extractNamespace(name)
      });
    }
  });
  
  // Parse a sample of HTML files to avoid memory issues
  const apiData = [];
  const sampleSize = Math.min(1000, tocStructure.length); // Process first 1000 items
  
  for (let i = 0; i < sampleSize; i++) {
    const tocItem = tocStructure[i];
    if (tocItem.htmlFile) {
      const parsedData = parseSimpleHtml(tocItem.htmlFile, tocItem);
      if (parsedData) {
        apiData.push(parsedData);
      }
      
      if (i % 50 === 0) {
        console.log(`Processed ${i}/${sampleSize} files...`);
      }
    }
  }
  
  console.log(`Completed parsing. Processed ${apiData.length} API items.`);
  
  // Create different views of the data
  const namespaces = apiData.filter(item => item.type === 'namespace');
  const classes = apiData.filter(item => item.type === 'class');
  const interfaces = apiData.filter(item => item.type === 'interface');
  const enums = apiData.filter(item => item.type === 'enum');
  const methods = apiData.filter(item => item.type === 'method');
  const properties = apiData.filter(item => item.type === 'property');
  
  // Save parsed data
  fs.writeFileSync(path.join(OUTPUT_DIR, 'full-api.json'), JSON.stringify(apiData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'toc-structure.json'), JSON.stringify(tocStructure, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'namespaces.json'), JSON.stringify(namespaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'classes.json'), JSON.stringify(classes, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'interfaces.json'), JSON.stringify(interfaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'enums.json'), JSON.stringify(enums, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'methods.json'), JSON.stringify(methods, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'properties.json'), JSON.stringify(properties, null, 2));
  
  // Create search index
  const searchIndex = apiData.map(item => ({
    title: item.title,
    type: item.type,
    namespace: item.namespace,
    summary: item.summary,
    description: item.description,
    htmlFile: item.htmlFile
  }));
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
  
  // Generate statistics
  const stats = {
    totalItems: apiData.length,
    totalInToc: tocStructure.length,
    namespaces: namespaces.length,
    classes: classes.length,
    interfaces: interfaces.length,
    enums: enums.length,
    methods: methods.length,
    properties: properties.length,
    processedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  
  console.log('\nParsing completed! Generated files:');
  console.log(`- full-api.json (${apiData.length} items)`);
  console.log(`- toc-structure.json (${tocStructure.length} items)`);
  console.log(`- search-index.json (${searchIndex.length} items)`);
  console.log('\nStatistics:');
  console.log(`  Total in TOC: ${stats.totalInToc}`);
  console.log(`  Processed: ${stats.totalItems}`);
  console.log(`  Namespaces: ${stats.namespaces}`);
  console.log(`  Classes: ${stats.classes}`);
  console.log(`  Interfaces: ${stats.interfaces}`);
  console.log(`  Enums: ${stats.enums}`);
  console.log(`  Methods: ${stats.methods}`);
  console.log(`  Properties: ${stats.properties}`);
  
  return { apiData, searchIndex, stats, tocStructure };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parseSimpleApi().catch(console.error);
}

export { parseSimpleApi };
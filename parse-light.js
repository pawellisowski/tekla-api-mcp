#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const TOC_FILE = './extracted-docs/TeklaOpenAPI_Reference.hhc';
const HTML_DIR = './extracted-docs/html';
const OUTPUT_DIR = './parsed-api';
const MAX_ITEMS = 3000; // Process 3000 items (3x more than current)

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
  // Handle different patterns of namespace in titles
  if (name.includes('Tekla.')) {
    // Pattern: "Tekla.Structures.Model.Beam Class" -> "Tekla.Structures.Model"
    const teklaMatch = name.match(/(Tekla\.[A-Za-z.]+)(?:\s+(?:Class|Interface|Enum|Namespace|Method|Property|Delegate))?/);
    if (teklaMatch) {
      let namespace = teklaMatch[1];
      // Remove trailing parts that are likely class/method names
      const parts = namespace.split('.');
      if (parts.length > 3) {
        // If it's something like "Tekla.Structures.Model.Beam.SomeMethod", keep only "Tekla.Structures.Model"
        namespace = parts.slice(0, 3).join('.');
      }
      return namespace;
    }
  }
  
  // Handle specific patterns
  if (name.includes('Tekla.Structures.Model')) return 'Tekla.Structures.Model';
  if (name.includes('Tekla.Structures.Drawing')) return 'Tekla.Structures.Drawing';
  if (name.includes('Tekla.Structures.Analysis')) return 'Tekla.Structures.Analysis';
  if (name.includes('Tekla.Structures.Geometry3d')) return 'Tekla.Structures.Geometry3d';
  if (name.includes('Tekla.Structures.Plugins')) return 'Tekla.Structures.Plugins';
  if (name.includes('Tekla.Structures')) return 'Tekla.Structures';
  
  return '';
}

function parseLight(filePath, tocItem) {
  try {
    const fullPath = path.join(HTML_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const htmlContent = fs.readFileSync(fullPath, 'utf-8');
    
    // Use regex instead of JSDOM to reduce memory usage
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    const descMatch = htmlContent.match(/<meta[^>]*name="Description"[^>]*content="([^"]*)"[^>]*>/i);
    const containerMatch = htmlContent.match(/<meta[^>]*name="container"[^>]*content="([^"]*)"[^>]*>/i);
    
    // Extract summary with simple regex
    const summaryMatch = htmlContent.match(/<div[^>]*class="summary"[^>]*>(.*?)<\/div>/is);
    
    const title = titleMatch ? titleMatch[1].trim() : tocItem.name;
    const description = descMatch ? descMatch[1] : '';
    const containerNamespace = containerMatch ? containerMatch[1] : '';
    
    let summary = '';
    if (summaryMatch) {
      // Remove HTML tags and extract text
      summary = summaryMatch[1].replace(/<[^>]*>/g, '').trim();
      // Clean up whitespace
      summary = summary.replace(/\s+/g, ' ');
    }
    
    // Extract namespace more accurately
    let namespace = tocItem.namespace || containerNamespace;
    
    // Fallback: extract from title
    if (!namespace) {
      namespace = extractNamespace(title);
    }

    return {
      title,
      description,
      summary: summary || description,
      namespace: namespace || '',
      type: tocItem.type,
      level: tocItem.level,
      htmlFile: filePath
    };
    
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

async function parseLightweight() {
  console.log(`⚡ Starting lightweight API parsing (${MAX_ITEMS} items)...`);
  
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
  
  // Clean up
  dom.window.close();
  
  // Process subset of items
  const subsetItems = tocStructure.slice(0, MAX_ITEMS);
  const apiData = [];
  let processed = 0;
  
  console.log(`\n📊 Processing ${subsetItems.length} items (${Math.round(subsetItems.length/tocStructure.length*100)}% of total)...`);
  
  for (let i = 0; i < subsetItems.length; i++) {
    const tocItem = subsetItems[i];
    if (tocItem.htmlFile) {
      const parsedData = parseLight(tocItem.htmlFile, tocItem);
      if (parsedData) {
        apiData.push(parsedData);
      }
      processed++;
      
      if (processed % 200 === 0 || processed === subsetItems.length) {
        const percentage = Math.round((processed / subsetItems.length) * 100);
        console.log(`   Processed ${processed}/${subsetItems.length} files (${percentage}%)...`);
        
        // Force garbage collection periodically
        if (global.gc) {
          global.gc();
        }
      }
    }
  }
  
  console.log(`\n✅ Completed parsing. Processed ${apiData.length} API items.`);
  
  // Create different views of the data
  const namespaces = apiData.filter(item => item.type === 'namespace');
  const classes = apiData.filter(item => item.type === 'class');
  const interfaces = apiData.filter(item => item.type === 'interface');
  const enums = apiData.filter(item => item.type === 'enum');
  const methods = apiData.filter(item => item.type === 'method');
  const properties = apiData.filter(item => item.type === 'property');
  
  // Save parsed data
  console.log('💾 Saving parsed data...');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'full-api.json'), JSON.stringify(apiData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'toc-structure.json'), JSON.stringify(tocStructure, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'namespaces.json'), JSON.stringify(namespaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'classes.json'), JSON.stringify(classes, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'interfaces.json'), JSON.stringify(interfaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'enums.json'), JSON.stringify(enums, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'methods.json'), JSON.stringify(methods, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'properties.json'), JSON.stringify(properties, null, 2));
  
  // Create search index
  console.log('🔍 Creating search index...');
  const searchIndex = apiData.map(item => ({
    title: item.title,
    type: item.type,
    namespace: item.namespace,
    summary: item.summary,
    description: item.description,
    htmlFile: item.htmlFile
  }));
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
  
  // Data validation and quality checks
  const validationReport = {
    totalParsed: apiData.length,
    totalInToc: tocStructure.length,
    subsetSize: subsetItems.length,
    coveragePercentage: Math.round((apiData.length / tocStructure.length) * 100),
    subsetCoveragePercentage: Math.round((apiData.length / subsetItems.length) * 100),
    qualityMetrics: {
      withNamespace: apiData.filter(item => item.namespace && item.namespace.trim().length > 0).length,
      withSummary: apiData.filter(item => item.summary && item.summary.trim().length > 10 && !item.summary.includes('Copyright ©')).length,
      withDescription: apiData.filter(item => item.description && item.description.trim().length > 10).length
    },
    namespaceBreakdown: {}
  };
  
  // Count items per namespace
  const namespaceCounts = {};
  for (const item of apiData) {
    const ns = item.namespace || 'Unknown';
    namespaceCounts[ns] = (namespaceCounts[ns] || 0) + 1;
  }
  validationReport.namespaceBreakdown = namespaceCounts;
  
  // Generate statistics
  const stats = {
    totalItems: apiData.length,
    totalInToc: tocStructure.length,
    subsetSize: subsetItems.length,
    namespaces: namespaces.length,
    classes: classes.length,
    interfaces: interfaces.length,
    enums: enums.length,
    methods: methods.length,
    properties: properties.length,
    processedAt: new Date().toISOString(),
    validation: validationReport
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  
  console.log('\n🎉 Parsing completed! Generated files:');
  console.log(`- full-api.json (${apiData.length} items)`);
  console.log(`- toc-structure.json (${tocStructure.length} items)`);
  console.log(`- search-index.json (${searchIndex.length} items)`);
  console.log('\n📊 Statistics:');
  console.log(`  Total in TOC: ${stats.totalInToc}`);
  console.log(`  Subset processed: ${stats.subsetSize} (${Math.round(stats.subsetSize/stats.totalInToc*100)}%)`);
  console.log(`  Successfully Processed: ${stats.totalItems} (${validationReport.coveragePercentage}% of total, ${validationReport.subsetCoveragePercentage}% of subset)`);
  console.log(`  Namespaces: ${stats.namespaces}`);
  console.log(`  Classes: ${stats.classes}`);
  console.log(`  Interfaces: ${stats.interfaces}`);
  console.log(`  Enums: ${stats.enums}`);
  console.log(`  Methods: ${stats.methods}`);
  console.log(`  Properties: ${stats.properties}`);
  
  console.log('\n📋 Quality Metrics:');
  console.log(`  Items with Namespace: ${validationReport.qualityMetrics.withNamespace} (${Math.round(validationReport.qualityMetrics.withNamespace/stats.totalItems*100)}%)`);
  console.log(`  Items with Good Summary: ${validationReport.qualityMetrics.withSummary} (${Math.round(validationReport.qualityMetrics.withSummary/stats.totalItems*100)}%)`);
  console.log(`  Items with Description: ${validationReport.qualityMetrics.withDescription} (${Math.round(validationReport.qualityMetrics.withDescription/stats.totalItems*100)}%)`);
  
  console.log('\n📦 Top Namespaces:');
  const sortedNamespaces = Object.entries(namespaceCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [namespace, count] of sortedNamespaces) {
    console.log(`  ${namespace}: ${count} items`);
  }
  
  return { apiData, searchIndex, stats, tocStructure };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parseLightweight().catch(console.error);
}

export { parseLightweight };
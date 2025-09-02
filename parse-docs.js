#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const EXTRACTED_DOCS_DIR = './extracted-docs';
const HTML_DIR = path.join(EXTRACTED_DOCS_DIR, 'html');
const TOC_FILE = path.join(EXTRACTED_DOCS_DIR, 'TeklaOpenAPI_Reference.hhc');
const OUTPUT_DIR = './parsed-api';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse the table of contents to build navigation structure
 */
function parseTableOfContents() {
  console.log('Parsing table of contents...');
  
  const tocContent = fs.readFileSync(TOC_FILE, 'utf-8');
  const dom = new JSDOM(tocContent);
  const document = dom.window.document;
  
  const tocStructure = [];
  const items = document.querySelectorAll('OBJECT[type="text/sitemap"]');
  
  items.forEach(item => {
    const nameParam = item.querySelector('param[name="Name"]');
    const localParam = item.querySelector('param[name="Local"]');
    
    if (nameParam && localParam) {
      const name = nameParam.getAttribute('value');
      const htmlFile = localParam.getAttribute('value').replace('html/', '');
      
      // Determine the level based on nesting
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
  
  return tocStructure;
}

/**
 * Determine the type of API item based on its name
 */
function determineItemType(name) {
  // Tekla Open API specific patterns
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

/**
 * Extract namespace from item name
 */
function extractNamespace(name) {
  // Extract namespace from patterns like "Tekla.Structures.Model"
  if (name.startsWith('Tekla.')) {
    const parts = name.split(' ');
    const namespacePart = parts[0];
    if (namespacePart.includes('.')) {
      return namespacePart;
    }
  }
  return '';
}

/**
 * Parse individual HTML file to extract API documentation
 */
function parseHtmlFile(filePath, tocItem) {
  try {
    const fullPath = path.join(HTML_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      return null;
    }

    const htmlContent = fs.readFileSync(fullPath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Extract basic information
    const title = document.querySelector('title')?.textContent?.trim() || tocItem.name;
    const description = document.querySelector('meta[name="Description"]')?.getAttribute('content') || '';
    
    // Extract main content sections
    const summary = extractTextContent(document.querySelector('.summary, .introduction, .description'));
    
    // Extract namespace information
    let namespace = tocItem.namespace;
    const namespaceElement = document.querySelector('.namespace, .namespaceName');
    if (namespaceElement) {
      namespace = namespaceElement.textContent.trim();
    }
    
    // Extract syntax information
    const syntaxSections = Array.from(document.querySelectorAll('.codeSnippetContainerCode pre, .syntax pre, pre.programlisting')).map(pre => 
      pre.textContent.trim()
    );
    
    // Extract inheritance information
    const inheritance = extractInheritanceInfo(document);
    
    // Extract members (properties, methods, etc.)
    const members = extractMembers(document);
    
    // Extract parameters (for methods)
    const parameters = extractParameters(document);
    
    // Extract return value information
    const returnValue = extractReturnValue(document);
    
    // Extract code examples
    const examples = extractExamples(document);
    
    // Extract see also references
    const seeAlso = extractSeeAlso(document);

    return {
      title,
      description,
      summary,
      namespace,
      syntax: syntaxSections,
      members,
      inheritance,
      parameters,
      returnValue,
      examples,
      seeAlso,
      type: tocItem.type,
      level: tocItem.level,
      htmlFile: filePath,
      lastModified: fs.statSync(fullPath).mtime
    };
    
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract text content safely
 */
function extractTextContent(element) {
  if (!element) return '';
  return element.textContent?.trim() || '';
}

/**
 * Extract inheritance hierarchy
 */
function extractInheritanceInfo(document) {
  const inheritance = [];
  
  // Look for inheritance sections
  const inheritanceSelectors = [
    '.inheritance',
    '.derivedClasses',
    '.baseClasses',
    'h3:contains("Inheritance Hierarchy") + ul',
    'h3:contains("Derived Classes") + ul'
  ];
  
  inheritanceSelectors.forEach(selector => {
    const section = document.querySelector(selector);
    if (section) {
      const links = section.querySelectorAll('a');
      links.forEach(link => {
        inheritance.push({
          name: link.textContent.trim(),
          htmlFile: link.getAttribute('href')
        });
      });
    }
  });
  
  return inheritance;
}

/**
 * Extract members (properties, methods, events, etc.)
 */
function extractMembers(document) {
  const members = [];
  
  // Look for member tables
  const memberTables = document.querySelectorAll('table.members, .memberList table, .membersTable');
  
  memberTables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const nameCell = cells[1] || cells[0];
        const descCell = cells[2] || cells[1];
        
        const link = nameCell.querySelector('a');
        const name = nameCell.textContent.trim();
        const description = extractTextContent(descCell);
        const htmlFile = link ? link.getAttribute('href') : null;
        
        if (name && !name.includes('Name') && !name.includes('Description')) {
          members.push({
            name,
            description,
            htmlFile,
            type: determineMemberTypeFromIcon(row) || 'member'
          });
        }
      }
    });
  });
  
  return members;
}

/**
 * Determine member type from icon or other indicators
 */
function determineMemberTypeFromIcon(row) {
  const iconImg = row.querySelector('img');
  if (!iconImg) return 'unknown';
  
  const src = iconImg.getAttribute('src') || '';
  const alt = iconImg.getAttribute('alt') || '';
  
  if (src.includes('property') || alt.includes('property')) return 'property';
  if (src.includes('method') || alt.includes('method')) return 'method';
  if (src.includes('event') || alt.includes('event')) return 'event';
  if (src.includes('field') || alt.includes('field')) return 'field';
  if (src.includes('constructor')) return 'constructor';
  
  return 'unknown';
}

/**
 * Extract parameter information (for methods)
 */
function extractParameters(document) {
  const parameters = [];
  
  // Look for parameter tables or sections
  const paramSections = document.querySelectorAll('.parameters table, .parametersTable, h3:contains("Parameters") + table');
  
  paramSections.forEach(section => {
    const rows = section.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const name = cells[0].textContent.trim();
        const description = cells[1].textContent.trim();
        const type = cells.length > 2 ? cells[2].textContent.trim() : '';
        
        if (name && !name.includes('Name') && !name.includes('Parameter')) {
          parameters.push({
            name,
            type,
            description
          });
        }
      }
    });
  });
  
  return parameters;
}

/**
 * Extract return value information
 */
function extractReturnValue(document) {
  const returnSection = document.querySelector('.returnValue, .returns, h3:contains("Return Value") + p');
  return extractTextContent(returnSection);
}

/**
 * Extract code examples
 */
function extractExamples(document) {
  const examples = [];
  
  const exampleSections = document.querySelectorAll('.example, .codeExample, .sampleCode');
  exampleSections.forEach(section => {
    const title = extractTextContent(section.querySelector('h4, h5, .title'));
    const description = extractTextContent(section.querySelector('.description, p'));
    const code = extractTextContent(section.querySelector('pre, code'));
    
    if (code) {
      examples.push({
        title: title || 'Example',
        description,
        code,
        language: 'csharp'
      });
    }
  });
  
  return examples;
}

/**
 * Extract "See Also" references
 */
function extractSeeAlso(document) {
  const seeAlso = [];
  
  const seeAlsoSection = document.querySelector('.seeAlso, h3:contains("See Also") + ul');
  if (seeAlsoSection) {
    const links = seeAlsoSection.querySelectorAll('a');
    links.forEach(link => {
      seeAlso.push({
        name: link.textContent.trim(),
        htmlFile: link.getAttribute('href')
      });
    });
  }
  
  return seeAlso;
}

/**
 * Main parsing function
 */
async function parseApiDocumentation() {
  console.log('Starting Tekla Open API documentation parsing...');
  
  // Parse table of contents
  const tocStructure = parseTableOfContents();
  console.log(`Found ${tocStructure.length} items in table of contents`);
  
  // Parse individual HTML files
  const apiData = [];
  let processed = 0;
  
  for (const tocItem of tocStructure) {
    if (tocItem.htmlFile) {
      const parsedData = parseHtmlFile(tocItem.htmlFile, tocItem);
      if (parsedData) {
        apiData.push(parsedData);
      }
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`Processed ${processed}/${tocStructure.length} files...`);
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
  const delegates = apiData.filter(item => item.type === 'delegate');
  
  // Save parsed data
  fs.writeFileSync(path.join(OUTPUT_DIR, 'full-api.json'), JSON.stringify(apiData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'toc-structure.json'), JSON.stringify(tocStructure, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'namespaces.json'), JSON.stringify(namespaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'classes.json'), JSON.stringify(classes, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'interfaces.json'), JSON.stringify(interfaces, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'enums.json'), JSON.stringify(enums, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'methods.json'), JSON.stringify(methods, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'properties.json'), JSON.stringify(properties, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'delegates.json'), JSON.stringify(delegates, null, 2));
  
  // Create search index
  const searchIndex = apiData.map(item => ({
    title: item.title,
    type: item.type,
    namespace: item.namespace,
    summary: item.summary,
    description: item.description,
    htmlFile: item.htmlFile,
    keywords: [
      item.title,
      item.namespace,
      ...item.members.map(m => m.name),
      ...item.syntax.join(' ').split(/\s+/)
    ].filter(k => k && k.length > 2).slice(0, 50) // Limit keywords per item
  }));
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
  
  // Generate statistics
  const stats = {
    totalItems: apiData.length,
    namespaces: namespaces.length,
    classes: classes.length,
    interfaces: interfaces.length,
    enums: enums.length,
    methods: methods.length,
    properties: properties.length,
    delegates: delegates.length,
    processedAt: new Date().toISOString(),
    coverage: {
      withSummary: apiData.filter(item => item.summary).length,
      withSyntax: apiData.filter(item => item.syntax.length > 0).length,
      withMembers: apiData.filter(item => item.members.length > 0).length,
      withExamples: apiData.filter(item => item.examples.length > 0).length
    }
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2));
  
  console.log('\nParsing completed! Generated files:');
  console.log(`- full-api.json (${apiData.length} items)`);
  console.log(`- search-index.json (${searchIndex.length} items)`);
  console.log(`- Individual type files (${classes.length} classes, ${methods.length} methods, etc.)`);
  console.log(`- stats.json`);
  console.log('\nStatistics:');
  console.log(`  Namespaces: ${stats.namespaces}`);
  console.log(`  Classes: ${stats.classes}`);
  console.log(`  Interfaces: ${stats.interfaces}`);
  console.log(`  Enums: ${stats.enums}`);
  console.log(`  Methods: ${stats.methods}`);
  console.log(`  Properties: ${stats.properties}`);
  console.log(`  Delegates: ${stats.delegates}`);
  
  return { apiData, searchIndex, stats };
}

// Always run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  parseApiDocumentation().catch(console.error);
}

export { parseApiDocumentation };
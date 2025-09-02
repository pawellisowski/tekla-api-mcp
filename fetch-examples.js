#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const EXAMPLES_DIR = './tekla-examples';
const OUTPUT_FILE = './parsed-api/examples.json';

async function fetchExamples() {
  console.log('Fetching Tekla Open API Examples...');
  
  try {
    // Clone the repository if it doesn't exist
    if (!fs.existsSync(EXAMPLES_DIR)) {
      console.log('Cloning TSOpenAPIExamples repository...');
      await execAsync(`git clone --depth 1 --branch 2025 https://github.com/TrimbleSolutionsCorporation/TSOpenAPIExamples.git ${EXAMPLES_DIR}`);
      console.log('Repository cloned successfully');
    } else {
      console.log('Repository already exists, pulling latest changes...');
      await execAsync(`cd ${EXAMPLES_DIR} && git pull`);
    }
    
    // Parse the examples
    const examples = await parseExamples();
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(examples, null, 2));
    console.log(`Saved ${examples.length} examples to ${OUTPUT_FILE}`);
    
    return examples;
    
  } catch (error) {
    console.error('Error fetching examples:', error.message);
    return [];
  }
}

async function parseExamples() {
  const examples = [];
  
  // Define paths to scan
  const pathsToScan = [
    'Model/Applications',
    'Model/Plugins', 
    'Drawings/Applications',
    'Drawings/Plugins',
    'CustomProperties'
  ];
  
  for (const scanPath of pathsToScan) {
    const fullPath = path.join(EXAMPLES_DIR, scanPath);
    if (fs.existsSync(fullPath)) {
      const exampleDirs = fs.readdirSync(fullPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const exampleDir of exampleDirs) {
        const examplePath = path.join(fullPath, exampleDir);
        const example = await parseExample(examplePath, scanPath, exampleDir);
        if (example) {
          examples.push(example);
        }
      }
    }
  }
  
  return examples;
}

async function parseExample(examplePath, category, name) {
  try {
    const example = {
      name,
      category,
      path: examplePath,
      description: '',
      files: [],
      codeSnippets: [],
      apiElements: []
    };
    
    // Look for README or description files
    const readmeFiles = ['README.md', 'README.txt', 'Description.txt'];
    for (const readmeFile of readmeFiles) {
      const readmePath = path.join(examplePath, readmeFile);
      if (fs.existsSync(readmePath)) {
        example.description = fs.readFileSync(readmePath, 'utf-8').substring(0, 500);
        break;
      }
    }
    
    // Find C# files
    const files = await findFiles(examplePath, ['.cs']);
    example.files = files.map(f => path.relative(EXAMPLES_DIR, f));
    
    // Parse code snippets and API usage
    for (const file of files.slice(0, 3)) { // Limit to first 3 files to avoid too much data
      const content = fs.readFileSync(file, 'utf-8');
      
      // Extract API elements used
      const apiElements = extractApiElements(content);
      example.apiElements.push(...apiElements);
      
      // Extract interesting code snippets
      const snippets = extractCodeSnippets(content, name);
      example.codeSnippets.push(...snippets);
    }
    
    // Remove duplicates
    example.apiElements = [...new Set(example.apiElements)];
    
    return example;
    
  } catch (error) {
    console.error(`Error parsing example ${name}:`, error.message);
    return null;
  }
}

async function findFiles(dir, extensions) {
  const files = [];
  
  function scanDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  scanDir(dir);
  return files;
}

function extractApiElements(code) {
  const elements = [];
  
  // Extract Tekla API namespaces and classes
  const teklaMatches = code.match(/Tekla\.\w+(\.\w+)*/g) || [];
  elements.push(...teklaMatches);
  
  // Extract common API patterns
  const patterns = [
    /new\s+(\w+)\(/g,  // Constructor calls
    /(\w+)\.(\w+)\(/g, // Method calls
    /using\s+(\w+(\.\w+)*);/g // Using statements
  ];
  
  for (const pattern of patterns) {
    const matches = [...code.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].includes('Tekla')) {
        elements.push(match[1]);
      }
    });
  }
  
  return elements.filter(el => el.startsWith('Tekla'));
}

function extractCodeSnippets(code, exampleName) {
  const snippets = [];
  
  // Extract methods
  const methodRegex = /(?:public|private|protected|internal)?\s*(?:static)?\s*\w+\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g;
  const methods = [...code.matchAll(methodRegex)];
  
  methods.slice(0, 2).forEach((match, index) => {
    if (match[0].length < 500 && match[1] !== 'Main') { // Skip very long methods and Main
      snippets.push({
        title: `${exampleName} - ${match[1]} Method`,
        code: match[0],
        language: 'csharp',
        description: `Method from ${exampleName} example`
      });
    }
  });
  
  // Extract key code blocks (simplified)
  const lines = code.split('\n');
  let currentBlock = [];
  let inInterestingBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Start of interesting block
    if (line.includes('new Tekla') || line.includes('Model.') || line.includes('Drawing.')) {
      inInterestingBlock = true;
      currentBlock = [line];
    } else if (inInterestingBlock) {
      currentBlock.push(line);
      
      // End of block
      if (line.includes(';') && currentBlock.length < 10) {
        const snippet = currentBlock.join('\n');
        if (snippet.length < 300) {
          snippets.push({
            title: `${exampleName} - API Usage`,
            code: snippet,
            language: 'csharp',
            description: `Code snippet from ${exampleName} example`
          });
        }
        inInterestingBlock = false;
        currentBlock = [];
      } else if (currentBlock.length > 15) {
        inInterestingBlock = false;
        currentBlock = [];
      }
    }
  }
  
  return snippets.slice(0, 3); // Limit snippets per file
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchExamples().catch(console.error);
}

export { fetchExamples };
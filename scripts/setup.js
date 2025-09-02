#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log(`
🏗️  Tekla API MCP Server Setup
=================================

This will set up the Tekla Open API MCP server for use with Claude Desktop.

Requirements:
- Tekla Open API CHM reference file
- Internet connection (to download code examples)
`);

  try {
    // Step 1: Build the project
    console.log('\n📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed');

    // Step 2: Ask about CHM file
    const chmPath = await question('\n📚 Enter path to your TeklaOpenAPI_Reference.chm file (or press Enter to skip): ');
    
    if (chmPath && chmPath.trim()) {
      const resolvedPath = path.resolve(chmPath.trim());
      if (fs.existsSync(resolvedPath)) {
        // Copy CHM file to project directory
        const targetPath = './TeklaOpenAPI_Reference.chm';
        if (!fs.existsSync(targetPath)) {
          fs.copyFileSync(resolvedPath, targetPath);
          console.log('✅ CHM file copied to project');
          
          // Extract and parse if extraction tools are available
          if (fs.existsSync('./extract-chm.js')) {
            console.log('\n📂 Extracting CHM file...');
            try {
              execSync('node extract-chm.js', { stdio: 'inherit' });
              console.log('✅ CHM extraction completed');
            } catch (error) {
              console.log('⚠️  CHM extraction failed (manual extraction may be needed)');
            }
          }
        } else {
          console.log('✅ CHM file already exists');
        }
      } else {
        console.log('❌ CHM file not found at specified path');
      }
    } else {
      console.log('⚠️  CHM file skipped - you can add it later');
    }

    // Step 3: Download examples
    console.log('\n📥 Downloading Tekla API examples...');
    if (fs.existsSync('./fetch-examples.js')) {
      try {
        execSync('node fetch-examples.js', { stdio: 'inherit' });
        console.log('✅ Examples downloaded and processed');
      } catch (error) {
        console.log('⚠️  Failed to download examples:', error.message);
      }
    } else {
      console.log('⚠️  Example fetching script not found');
    }

    // Step 4: Parse documentation if available
    if (fs.existsSync('./TeklaOpenAPI_Reference.chm') && fs.existsSync('./parse-simple.js')) {
      console.log('\n🔍 Parsing API documentation...');
      try {
        execSync('node parse-simple.js', { stdio: 'inherit' });
        console.log('✅ Documentation parsed');
      } catch (error) {
        console.log('⚠️  Documentation parsing failed:', error.message);
      }
    }

    // Step 5: Generate Claude Desktop config
    console.log('\n📋 Generating Claude Desktop configuration...');
    
    const configDir = process.cwd();
    const config = {
      "mcpServers": {
        "tekla-api-mcp": {
          "command": "node",
          "args": [path.join(configDir, "dist", "index.js")],
          "cwd": configDir
        }
      }
    };

    const configFile = './examples/claude-desktop-config.json';
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    console.log(`\n✅ Setup completed successfully!

📋 Next Steps:
1. Add this configuration to your Claude Desktop config file:

${JSON.stringify(config, null, 2)}

2. Claude Desktop config file location:
   • Windows: %APPDATA%\\Claude\\claude_desktop_config.json
   • macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
   • Linux: ~/.config/claude/claude_desktop_config.json

3. Restart Claude Desktop

4. You can now ask Claude about Tekla API!

Examples:
- "Search for Model class in Tekla API"
- "Show me beam creation examples"
- "What namespaces are available in Tekla?"

🔗 Documentation: https://github.com/pawellisowski/tekla-api-mcp
    `);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup().catch(console.error);
}

export { setup };
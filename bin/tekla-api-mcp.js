#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function showHelp() {
  console.log(`
🏗️  Tekla API MCP Server

Usage:
  npx tekla-api-mcp                  # Start the MCP server
  npx tekla-api-mcp setup            # Interactive setup
  npx tekla-api-mcp config           # Generate Claude Desktop config
  npx tekla-api-mcp --help           # Show this help

Requirements:
  - Node.js 18+
  - Tekla Open API CHM file
  
Quick Start:
  1. npx tekla-api-mcp setup
  2. Add generated config to Claude Desktop
  3. Restart Claude Desktop
  
Repository: https://github.com/pawellisowski/tekla-api-mcp
  `);
}

function generateConfig() {
  const configPath = process.cwd();
  const config = {
    "mcpServers": {
      "tekla-api-mcp": {
        "command": "npx",
        "args": ["tekla-api-mcp"],
        "cwd": configPath
      }
    }
  };
  
  console.log(`
📋 Claude Desktop Configuration:

Add this to your Claude Desktop configuration file:

${JSON.stringify(config, null, 2)}

Configuration file locations:
- Windows: %APPDATA%\\Claude\\claude_desktop_config.json
- macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
- Linux: ~/.config/claude/claude_desktop_config.json
  `);
}

async function runSetup() {
  try {
    console.log('🚀 Setting up Tekla API MCP Server...');
    
    // Check if setup script exists
    const setupScript = join(rootDir, 'scripts', 'setup.js');
    if (fs.existsSync(setupScript)) {
      execSync(`node "${setupScript}"`, { stdio: 'inherit', cwd: rootDir });
    } else {
      console.log('⚠️  Setup script not found. Running basic setup...');
      // Run basic commands
      execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
      console.log('✅ Build completed');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function startServer() {
  try {
    const serverPath = join(rootDir, 'dist', 'index.js');
    
    if (!fs.existsSync(serverPath)) {
      console.error('❌ Server not built. Run: npx tekla-api-mcp setup');
      process.exit(1);
    }
    
    // Start the MCP server
    execSync(`node "${serverPath}"`, { stdio: 'inherit', cwd: rootDir });
    
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
}

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'setup':
    runSetup();
    break;
  case 'config':
    generateConfig();
    break;
  case '--help':
  case '-h':
  case 'help':
    showHelp();
    break;
  default:
    // Default: start the server
    startServer();
    break;
}
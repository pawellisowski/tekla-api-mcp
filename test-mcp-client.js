#!/usr/bin/env node

import { spawn } from 'child_process';

function testMcpServer() {
  console.log('Testing MCP JSON-RPC communication...');
  
  const server = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdoutData = '';
  let stderrData = '';

  server.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  server.stderr.on('data', (data) => {
    stderrData += data.toString();
    console.log('Server stderr:', data.toString().trim());
  });

  // Send initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  setTimeout(() => {
    console.log('Sending initialize request...');
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    
    setTimeout(() => {
      console.log('\nStdout data received:', stdoutData.length > 0 ? 'YES' : 'NO');
      if (stdoutData) {
        try {
          const response = JSON.parse(stdoutData.trim());
          console.log('Valid JSON response received:', !!response.id);
          console.log('Response contains result:', !!response.result);
        } catch (e) {
          console.log('Invalid JSON in stdout:', stdoutData.substring(0, 100));
        }
      }
      
      server.kill('SIGTERM');
    }, 1000);
  }, 1000);

  server.on('close', (code) => {
    console.log(`\nServer process closed with code: ${code}`);
    console.log('Test completed.');
  });
}

testMcpServer();
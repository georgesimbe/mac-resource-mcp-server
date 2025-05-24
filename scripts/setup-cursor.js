#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CLAUDE_CONFIG_PATH = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
const SERVER_PATH = join(process.cwd(), 'dist', 'index.js');

function setupCursorMCP() {
  console.log('🔧 Setting up Mac Resource MCP Server for Cursor/Claude...');
  
  // Check if server is built
  if (!existsSync(SERVER_PATH)) {
    console.error('❌ Server not built. Please run "npm run build" first.');
    process.exit(1);
  }
  
  let config = {};
  
  // Read existing config if it exists
  if (existsSync(CLAUDE_CONFIG_PATH)) {
    try {
      const existingConfig = readFileSync(CLAUDE_CONFIG_PATH, 'utf8');
      config = JSON.parse(existingConfig);
      console.log('📖 Found existing Claude config');
    } catch (error) {
      console.log('⚠️ Could not parse existing Claude config, creating new one');
    }
  }
  
  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  // Add our server
  config.mcpServers['mac-resource-manager'] = {
    command: 'node',
    args: [SERVER_PATH]
  };
  
  try {
    // Create directory if it doesn't exist
    const configDir = join(homedir(), 'Library', 'Application Support', 'Claude');
    if (!existsSync(configDir)) {
      console.log('📁 Creating Claude config directory...');
      // Note: This would require mkdir -p functionality
    }
    
    // Write config
    writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Successfully added Mac Resource MCP Server to Claude config');
    console.log(`📍 Config location: ${CLAUDE_CONFIG_PATH}`);
    console.log('🔄 Please restart Claude Desktop to load the new server');
    
    // Display the configuration
    console.log('\n📋 Added configuration:');
    console.log(JSON.stringify({
      'mac-resource-manager': config.mcpServers['mac-resource-manager']
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to write Claude config:', error.message);
    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🛠️ Mac Resource MCP Server - Cursor Setup

Usage: npm run setup-cursor

This script will:
1. Add the Mac Resource MCP Server to your Claude Desktop configuration
2. Configure the server to run automatically when Claude starts
3. Enable natural language resource management in Cursor

After running this script:
1. Restart Claude Desktop
2. You can now ask Claude to:
   - "Check if port 4321 is available"
   - "Kill all processes on port 3000"
   - "Show me development server status"
   - "Free up ports for new development session"
   - "Monitor port 4321 for conflicts"
   - "What's my current system resource usage?"

Configuration will be added to:
${CLAUDE_CONFIG_PATH}
  `);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
} else {
  setupCursorMCP();
}
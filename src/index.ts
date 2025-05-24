#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { MacResourceManager } from './resource-manager.js';

const server = new Server(
  {
    name: 'mac-resource-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const resourceManager = new MacResourceManager();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'check_port',
        description: 'Check if a specific port is in use and show process details',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number to check (1-65535)',
              minimum: 1,
              maximum: 65535,
            },
          },
          required: ['port'],
        },
      },
      {
        name: 'kill_port',
        description: 'Kill processes running on a specific port',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number to kill processes on (1-65535)',
              minimum: 1,
              maximum: 65535,
            },
            force: {
              type: 'boolean',
              description: 'Force kill with SIGKILL instead of graceful SIGTERM',
              default: false,
            },
          },
          required: ['port'],
        },
      },
      {
        name: 'list_dev_ports',
        description: 'Check status of common development ports (3000, 3001, 4321, 5173, 8000, 8080, 8100, 9000)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'system_resources',
        description: 'Get current system resource usage (memory, CPU, network)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kill_dev_servers',
        description: 'Kill development servers by type or all',
        inputSchema: {
          type: 'object',
          properties: {
            server_type: {
              type: 'string',
              description: 'Type of server to kill: astro, npm, vite, next, or all',
              enum: ['astro', 'npm', 'vite', 'next', 'all'],
              default: 'all',
            },
          },
        },
      },
      {
        name: 'monitor_port',
        description: 'Monitor a port for changes in real-time',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number to monitor (1-65535)',
              minimum: 1,
              maximum: 65535,
            },
            duration: {
              type: 'number',
              description: 'Duration to monitor in seconds (default: 30)',
              default: 30,
              minimum: 5,
              maximum: 300,
            },
          },
          required: ['port'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'check_port':
        return await resourceManager.checkPort(args?.port as number);

      case 'kill_port':
        return await resourceManager.killPort(args?.port as number, (args?.force as boolean) || false);

      case 'list_dev_ports':
        return await resourceManager.listDevPorts();

      case 'system_resources':
        return await resourceManager.getSystemResources();

      case 'kill_dev_servers':
        return await resourceManager.killDevServers((args?.server_type as string) || 'all');

      case 'monitor_port':
        return await resourceManager.monitorPort(args?.port as number, (args?.duration as number) || 30);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Mac Resource MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
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
      {
        name: 'list_protected_services',
        description: 'List all protected ports and services that cannot be killed',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kill_dev_servers_selective',
        description: 'Intelligently kill only development servers while protecting databases and system services',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_project',
        description: 'Register a project with its ports for session persistence',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            directory: {
              type: 'string',
              description: 'Project directory path',
            },
            ports: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of ports used by this project',
            },
            framework: {
              type: 'string',
              description: 'Framework being used (e.g., Next.js, Astro, Vite)',
            },
          },
          required: ['name', 'directory', 'ports', 'framework'],
        },
      },
      {
        name: 'list_active_projects',
        description: 'List all registered active projects and their ports',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kill_project_ports',
        description: 'Kill ports for a specific project only',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project to clean up',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'add_protected_port',
        description: 'Add a custom port to the protected list',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port number to protect (1-65535)',
              minimum: 1,
              maximum: 65535,
            },
            service: {
              type: 'string',
              description: 'Description of the service running on this port',
            },
          },
          required: ['port', 'service'],
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

      case 'list_protected_services':
        return await resourceManager.listProtectedServices();

      case 'kill_dev_servers_selective':
        return await resourceManager.killDevServersSelective();

      case 'add_project':
        return await resourceManager.addProject(
          args?.name as string,
          args?.directory as string,
          args?.ports as number[],
          args?.framework as string
        );

      case 'list_active_projects':
        return await resourceManager.listActiveProjects();

      case 'kill_project_ports':
        return await resourceManager.killProjectPorts(args?.project_name as string);

      case 'add_protected_port':
        return await resourceManager.addCustomProtectedPort(args?.port as number, args?.service as string);

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
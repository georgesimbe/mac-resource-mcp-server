# Claude Code CLI Configuration

This document provides configuration instructions for using the Mac Resource Management MCP Server with Claude Code CLI.

## Automatic Configuration

The MCP server should work automatically with Claude Code CLI when installed through the installation script:

```bash
./install.sh
```

## Manual Configuration

If you need to manually configure the server for Claude Code CLI:

### Option 1: Environment Variable

```bash
export MAC_RESOURCE_MCP_SERVER="node /path/to/mac-resource-mcp-server/dist/index.js"
```

### Option 2: CLAUDE.md Configuration

Add this to your project's `CLAUDE.md` file:

```markdown
# MCP Servers

## Mac Resource Manager

This project uses the Mac Resource Management MCP Server for port management and system monitoring.

Server path: `/path/to/mac-resource-mcp-server/dist/index.js`

Available tools:
- check_port
- kill_port  
- list_dev_ports
- system_resources
- kill_dev_servers
- monitor_port
- list_protected_services
- kill_dev_servers_selective
- add_project
- list_active_projects
- kill_project_ports
- add_protected_port
```

### Option 3: Direct Invocation

You can also run the server directly when needed:

```bash
node /path/to/mac-resource-mcp-server/dist/index.js
```

## Verification

To verify the server is working with Claude Code CLI, you can test with:

```
"Check if port 3000 is available"
"List development ports status"
"Show my system resources"
```

The server should respond with formatted output showing port status and system information.
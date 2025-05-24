# 🛠️ Mac Resource Management MCP Server

A comprehensive Mac Resource Management MCP (Model Context Protocol) server that integrates with Cursor IDE to prevent port conflicts, manage development server instances, and monitor system resources in real-time.

## ✨ Features

- 🚫 **Port Conflict Prevention** - Automatically detect and resolve port conflicts
- 🔍 **Real-time Port Monitoring** - Monitor specific ports for changes
- 💻 **System Resource Monitoring** - CPU, Memory, and Network usage
- 🎯 **Development Server Management** - Kill specific or all dev servers
- 🔗 **Seamless Cursor Integration** - Natural language interface in Cursor IDE
- 🍎 **Mac-Optimized** - Uses native macOS commands for best performance

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/georgesimbe/mac-resource-mcp-server.git
cd mac-resource-mcp-server
./install.sh
```

### Usage in Cursor

After installation, restart Cursor and Claude Desktop. You can now use natural language:

```
"Check if port 4321 is available"
"Kill all processes on port 3000"
"Show me development server status"
"Free up ports for new development session"
"Monitor port 4321 for conflicts"
"What's my current system resource usage?"
```

## 🛠️ Available Tools

### `check_port(port: number)`
Check if a specific port is in use and show process details.

**Example:**
```
> Check port 3000
🔴 Port 3000 is in use:
  • PID: 12345
  • Process: node
  • Command: npm run dev
```

### `kill_port(port: number, force?: boolean)`
Kill processes running on a specific port.

**Parameters:**
- `port`: Port number (1-65535)
- `force`: Use SIGKILL instead of SIGTERM (default: false)

### `list_dev_ports()`
Check status of common development ports (3000, 3001, 4321, 5173, 8000, 8080, 8100, 9000).

**Example:**
```
🔍 Development Ports Status:

Port 3000: 🔴 In-use (PID: 12345, Process: node)
Port 3001: 🟢 Available
Port 4321: 🔴 In-use (PID: 67890, Process: astro)
```

### `system_resources()`
Get current system resource usage (memory, CPU, network).

**Example:**
```
📊 System Resources:

💾 Memory Pressure: Normal
🧠 Memory Usage:
  Pages free: 123456
  Pages active: 789012
  
⚡ CPU usage: 15.2% user, 8.1% sys, 76.7% idle

🌐 Network:
  • Established connections: 42
  • Listening ports: 18
```

### `kill_dev_servers(server_type?: string)`
Kill development servers by type or all.

**Server Types:**
- `astro` - Kill Astro development servers
- `npm` - Kill npm development servers
- `vite` - Kill Vite servers
- `next` - Kill Next.js servers
- `all` - Kill all development servers (default)

### `monitor_port(port: number, duration?: number)`
Monitor a port for changes in real-time.

**Parameters:**
- `port`: Port number to monitor
- `duration`: Duration in seconds (default: 30, max: 300)

## 🔧 Manual Setup

### Prerequisites

- Node.js 18+
- macOS (optimized for Mac commands)
- Cursor IDE with Claude integration

### Build from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Setup Claude Desktop integration
npm run setup-cursor
```

### Manual Claude Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mac-resource-manager": {
      "command": "node",
      "args": ["/path/to/mac-resource-mcp-server/dist/index.js"]
    }
  }
}
```

## 📋 Shell Aliases

The installation script creates helpful aliases:

```bash
# Check development ports
dev-ports

# Kill all development servers
kill-dev

# Clean development environment
dev-clean

# Check specific port
port-check 3000

# Kill specific port
port-kill 3000
```

## 🔒 Security

- Validates port ranges (1-65535)
- Prevents killing system-critical processes
- Graceful termination with SIGTERM by default
- Force kill option with explicit confirmation

## 🐛 Troubleshooting

### Port still in use after killing
Some processes may take time to terminate. Wait a few seconds and check again.

### Permission denied errors
Ensure you have proper permissions to kill processes. Some system processes require admin privileges.

### Memory pressure unavailable
The `memory_pressure` command requires macOS. Ensure you're running on a Mac system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Optimized for macOS system commands
- Designed for seamless Cursor IDE integration

---

**Made with ❤️ for the Mac development community**
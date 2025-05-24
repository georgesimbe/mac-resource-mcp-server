# 🛠️ Mac Resource Management MCP Server

A comprehensive Mac Resource Management MCP (Model Context Protocol) server that integrates with **both Cursor IDE and Claude Code CLI** to prevent port conflicts, manage development server instances, and monitor system resources in real-time with advanced protection for critical services.

## ✨ Features

- 🛡️ **Protected Service Detection** - Never accidentally kill Docker, databases, or system services
- 🎯 **Project-Aware Management** - Track multiple projects and their ports independently
- 🔄 **Session Persistence** - Survives AI chat restarts and maintains project state
- 🚫 **Port Conflict Prevention** - Automatically detect and resolve port conflicts
- 🔍 **Real-time Port Monitoring** - Monitor specific ports for changes
- 💻 **System Resource Monitoring** - CPU, Memory, and Network usage
- 🧠 **Intelligent Cleanup** - Smart development server management that protects critical services
- 🔗 **Dual Platform Support** - Works seamlessly in both Cursor IDE and Claude Code CLI
- 🍎 **Mac-Optimized** - Uses native macOS commands for best performance

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/georgesimbe/mac-resource-mcp-server.git
cd mac-resource-mcp-server
./install.sh
```

### Usage in Cursor IDE & Claude Code CLI

After installation, restart Cursor and Claude Desktop (for Cursor IDE) or ensure Claude Code CLI is properly configured. You can now use natural language:

```
"Check if port 4321 is available"
"Register my Next.js project on ports 3000 and 3001"
"Kill only development servers, protect my database"
"Show me my active projects"
"Clean up ports for my React project only"
"What services are protected from being killed?"
"Add my custom Redis instance on port 6380 to protected list"
```

## 🛠️ Core Tools

### Port Management

#### `check_port(port: number)`
Check if a specific port is in use and show process details.

**Example:**
```
> Check port 3000
🔴 Port 3000 is in use:
  • PID: 12345
  • Process: node
  • Command: npm run dev
```

#### `kill_port(port: number, force?: boolean)`
Kill processes running on a specific port with protection checks.

**Protection Features:**
- Automatically protects database servers (MySQL, PostgreSQL, Redis, MongoDB)
- Prevents killing Docker services
- Blocks system services (SSH, HTTP, HTTPS)
- Warns about critical processes before termination

#### `list_dev_ports()`
Check status of common development ports (3000, 3001, 4321, 5173, 8000, 8080, 8100, 9000).

#### `monitor_port(port: number, duration?: number)`
Monitor a port for changes in real-time.

### 🛡️ Protection & Security

#### `list_protected_services()`
Show all protected ports and services that cannot be killed.

**Example:**
```
🛡️ Protected Services Configuration:

📋 Protected Ports:
  • Port 22: SSH
  • Port 3306: MySQL
  • Port 5432: PostgreSQL
  • Port 6379: Redis
  • Port 27017: MongoDB
  • Port 2375: Docker daemon (unsecured)
  • Port 2376: Docker daemon (secured)

🔍 Currently Running Protected Services:
  • MySQL on port 3306 ✅
  • Redis on port 6379 ✅
```

#### `add_protected_port(port: number, service: string)`
Add custom ports to the protected list.

**Example:**
```bash
> Add port 6380 as "Custom Redis Instance"
🛡️ Added port 6380 to protected services as "Custom Redis Instance"
```

#### `kill_dev_servers_selective()`
Intelligently kill only development servers while protecting databases and system services.

**Smart Detection:**
- Identifies and protects Docker containers
- Preserves database connections
- Maintains system services
- Only terminates development servers

### 🎯 Project Management

#### `add_project(name: string, directory: string, ports: number[], framework: string)`
Register a project with its ports for session persistence.

**Example:**
```bash
> Register "My Next.js App" at "/Users/dev/my-app" using ports [3000, 3001] with Next.js
✅ Added project "My Next.js App" with ports [3000, 3001] using Next.js framework
```

#### `list_active_projects()`
List all registered active projects and their ports.

**Example:**
```
📋 Active Projects:

🚀 My Next.js App (Next.js)
   📁 /Users/dev/my-app
   🔌 Ports: 3000, 3001
   ⏰ Last active: 12/24/2024, 2:30:15 PM

🚀 Astro Blog (Astro)
   📁 /Users/dev/blog
   🔌 Ports: 4321
   ⏰ Last active: 12/24/2024, 1:45:22 PM
```

#### `kill_project_ports(project_name: string)`
Kill ports for a specific project only, leaving other projects untouched.

**Smart Project Cleanup:**
- Only affects the specified project's ports
- Protects other projects from accidental termination
- Maintains database and system service connections
- Perfect for AI chat restarts

### System Monitoring

#### `system_resources()`
Get current system resource usage (memory, CPU, network).

#### `kill_dev_servers(server_type?: string)`
Kill development servers by type or all.

**Server Types:**
- `astro` - Kill Astro development servers
- `npm` - Kill npm development servers  
- `vite` - Kill Vite servers
- `next` - Kill Next.js servers
- `all` - Kill all development servers (default)

## 🔄 Session Persistence

The server automatically maintains session data in `~/.mac-resource-mcp/session.json`:

- **Project Registry** - Remembers your active projects and their ports
- **Custom Protected Ports** - Preserves your custom protection rules
- **Auto-Cleanup** - Removes projects inactive for 24+ hours
- **AI Chat Resilience** - Survives Claude/Cursor restarts

## 🧠 AI Chat Restart Scenarios

Perfect for when you're running multiple projects and the AI chat restarts:

```bash
# Before AI restart - Register your projects
"Register my React app on port 3000 and API on 3001"
"Add my local Redis on port 6380 to protected services"
"Register my Astro blog on port 4321"

# After AI restart - Projects are automatically remembered
"Clean up only my React app ports"  # Only kills 3000, 3001
"Show my active projects"           # Lists all registered projects
"Kill development servers but protect databases"  # Smart cleanup
```

## 🔧 Manual Setup

### Prerequisites

- Node.js 18+
- macOS (optimized for Mac commands)
- Cursor IDE with Claude integration **OR** Claude Code CLI

### Build from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Setup Claude Desktop integration
npm run setup-cursor
```

### Configuration for Different Platforms

#### Cursor IDE (via Claude Desktop)

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

#### Claude Code CLI

The server works automatically with Claude Code CLI when properly installed. The MCP server will be available through the standard MCP protocol.

**For detailed Claude Code CLI configuration**, see [claude-code-config.md](claude-code-config.md).

**Quick setup for Claude Code CLI**:

1. **Automatic**: Run `./install.sh` - the server will be available automatically
2. **Manual**: Add to your project's `CLAUDE.md`:
   ```markdown
   # MCP Servers
   Server path: `/path/to/mac-resource-mcp-server/dist/index.js`
   ```
3. **Environment variable**:
   ```bash
   export MAC_RESOURCE_MCP_SERVER="node /path/to/mac-resource-mcp-server/dist/index.js"
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

## 🔒 Security & Protection

### Built-in Protected Services
- **Databases**: MySQL (3306), PostgreSQL (5432), Redis (6379), MongoDB (27017)
- **Docker**: Docker daemon (2375, 2376), Docker Swarm (2377)
- **System Services**: SSH (22), HTTP (80), HTTPS (443), DNS (53), SMTP (25)
- **Development DBs**: SQL Server (1433), CouchDB (5984), Elasticsearch (9200)
- **Message Brokers**: RabbitMQ (5672), Kafka (9092)

### Smart Process Detection
- Validates port ranges (1-65535)
- Prevents killing system-critical processes
- Graceful termination with SIGTERM by default
- Process pattern matching for critical services
- Custom protection rules with session persistence

## 🐛 Troubleshooting

### Port still in use after killing
Some processes may take time to terminate. Wait a few seconds and check again.

### Permission denied errors
Ensure you have proper permissions to kill processes. Some system processes require admin privileges.

### Protected service warnings
If you get protection warnings, use `list_protected_services` to see what's protected and why.

### Session data issues
Session data is stored in `~/.mac-resource-mcp/session.json`. Delete this file to reset.

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
- Designed for seamless Cursor IDE and Claude Code CLI integration
- Enhanced with AI-first development workflows

---

**Made with ❤️ for the Mac development community**
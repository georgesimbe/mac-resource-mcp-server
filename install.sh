#!/bin/bash

# Mac Resource MCP Server Installation Script
set -e

echo "🚀 Installing Mac Resource MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Make scripts executable
echo "🔧 Setting up permissions..."
chmod +x scripts/setup-cursor.js
chmod +x install.sh

# Create shell aliases
echo "🔗 Creating shell aliases..."
ALIASES_FILE="$HOME/.mac-resource-aliases"

cat > "$ALIASES_FILE" << 'EOF'
# Mac Resource MCP Server Aliases
alias dev-check='node ~/mac-resource-mcp-server/dist/index.js'
alias kill-dev='pkill -f "astro dev" && pkill -f "npm run dev" && pkill -f "vite" && pkill -f "next dev"'
alias dev-ports='lsof -i -P | grep LISTEN | grep -E "(3000|3001|4321|5173|8000|8080|8100|9000)"'
alias dev-clean='kill-dev && sleep 2 && echo "🧹 Development environment cleaned"'
alias port-check='function _port_check() { lsof -i :$1 -P -n; }; _port_check'
alias port-kill='function _port_kill() { lsof -ti :$1 | xargs kill -9; }; _port_kill'
EOF

# Add to shell profile
SHELL_PROFILE=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
fi

if [ -n "$SHELL_PROFILE" ]; then
    if ! grep -q "mac-resource-aliases" "$SHELL_PROFILE"; then
        echo "" >> "$SHELL_PROFILE"
        echo "# Mac Resource MCP Server Aliases" >> "$SHELL_PROFILE"
        echo "source $ALIASES_FILE" >> "$SHELL_PROFILE"
        echo "✅ Added aliases to $SHELL_PROFILE"
    else
        echo "ℹ️ Aliases already exist in $SHELL_PROFILE"
    fi
fi

# Setup Cursor/Claude configuration
echo "🎯 Setting up Cursor/Claude integration..."
npm run setup-cursor

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📋 What's been installed:"
echo "  ✅ Mac Resource MCP Server built and ready"
echo "  ✅ Shell aliases created ($ALIASES_FILE)"
echo "  ✅ Claude Desktop configuration updated"
echo ""
echo "🔄 Next steps:"
echo "  1. Restart your terminal (or run: source $SHELL_PROFILE)"
echo "  2. Restart Claude Desktop"
echo "  3. Test with: dev-ports"
echo ""
echo "💬 You can now ask Claude in Cursor:"
echo "  • 'Check if port 4321 is available'"
echo "  • 'Kill all processes on port 3000'"
echo "  • 'Show me development server status'"
echo "  • 'Free up ports for new development session'"
echo ""
echo "🛠️ Available aliases:"
echo "  • dev-check    - Check development ports"
echo "  • kill-dev     - Kill all development servers"
echo "  • dev-ports    - List ports in use"
echo "  • dev-clean    - Clean development environment"
echo "  • port-check   - Check specific port (usage: port-check 3000)"
echo "  • port-kill    - Kill specific port (usage: port-kill 3000)"
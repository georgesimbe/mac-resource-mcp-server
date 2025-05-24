import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

export interface ToolResult extends CallToolResult {
  content: TextContent[];
}

export interface PortInfo {
  port: number;
  status: 'available' | 'in-use';
  pid?: number;
  processName?: string;
  command?: string;
}

export interface SystemResources {
  memory: {
    pressure: string;
    usage: string;
  };
  cpu: {
    usage: string;
  };
  network: {
    established_connections: number;
    listening_ports: number;
  };
}

export class MacResourceManager {
  private readonly COMMON_DEV_PORTS = [3000, 3001, 4321, 5173, 8000, 8080, 8100, 9000];
  
  private readonly SERVER_PATTERNS = {
    astro: ['astro dev', 'astro preview'],
    npm: ['npm run dev', 'npm start', 'npm run serve'],
    vite: ['vite', 'vite dev', 'vite serve'],
    next: ['next dev', 'next start'],
  };

  async checkPort(port: number): Promise<ToolResult> {
    try {
      this.validatePort(port);
      
      const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
      
      if (!stdout.trim()) {
        return {
          content: [{
            type: 'text',
            text: `🟢 Port ${port} is available`
          }]
        };
      }

      const lines = stdout.trim().split('\n');
      const processInfo = this.parseProcessInfo(lines);
      
      let result = `🔴 Port ${port} is in use:\n`;
      processInfo.forEach(info => {
        result += `  • PID: ${info.pid}\n`;
        result += `  • Process: ${info.processName}\n`;
        result += `  • Command: ${info.command}\n`;
      });

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('No such process')) {
        return {
          content: [{
            type: 'text',
            text: `🟢 Port ${port} is available`
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `❌ Error checking port ${port}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async killPort(port: number, force: boolean): Promise<ToolResult> {
    try {
      this.validatePort(port);
      
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      
      if (!stdout.trim()) {
        return {
          content: [{
            type: 'text',
            text: `ℹ️ No processes found on port ${port}`
          }]
        };
      }

      const pids = stdout.trim().split('\n').filter(pid => pid);
      const signal = force ? 'KILL' : 'TERM';
      
      let result = `${force ? '💀' : '⚡'} ${force ? 'Force killing' : 'Gracefully terminating'} processes on port ${port}:\n`;
      
      for (const pid of pids) {
        try {
          await execAsync(`kill -${signal} ${pid}`);
          result += `  ✅ Killed PID ${pid}\n`;
        } catch (error) {
          result += `  ❌ Failed to kill PID ${pid}: ${error instanceof Error ? error.message : String(error)}\n`;
        }
      }

      // Wait a moment and verify
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        await execAsync(`lsof -ti :${port}`);
        result += `⚠️ Some processes may still be running on port ${port}`;
      } catch {
        result += `✅ Port ${port} is now free`;
      }

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error killing processes on port ${port}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async listDevPorts(): Promise<ToolResult> {
    try {
      const portStatuses: PortInfo[] = [];
      
      for (const port of this.COMMON_DEV_PORTS) {
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
          
          if (!stdout.trim()) {
            portStatuses.push({ port, status: 'available' });
          } else {
            const lines = stdout.trim().split('\n');
            const processInfo = this.parseProcessInfo(lines);
            
            if (processInfo.length > 0) {
              portStatuses.push({
                port,
                status: 'in-use',
                pid: processInfo[0].pid,
                processName: processInfo[0].processName,
                command: processInfo[0].command
              });
            }
          }
        } catch {
          portStatuses.push({ port, status: 'available' });
        }
      }

      let result = '🔍 Development Ports Status:\n\n';
      
      portStatuses.forEach(info => {
        const status = info.status === 'available' ? '🟢 Available' : '🔴 In-use';
        result += `Port ${info.port}: ${status}`;
        
        if (info.status === 'in-use') {
          result += ` (PID: ${info.pid}, Process: ${info.processName})`;
        }
        
        result += '\n';
      });

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error listing development ports: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async getSystemResources(): Promise<ToolResult> {
    try {
      const resources: SystemResources = {
        memory: { pressure: '', usage: '' },
        cpu: { usage: '' },
        network: { established_connections: 0, listening_ports: 0 }
      };

      // Memory pressure (Mac-specific)
      try {
        const { stdout: memoryPressure } = await execAsync('memory_pressure');
        resources.memory.pressure = memoryPressure.trim();
      } catch {
        resources.memory.pressure = 'Unable to determine memory pressure';
      }

      // Memory usage
      try {
        const { stdout: memoryUsage } = await execAsync('vm_stat | head -4');
        resources.memory.usage = memoryUsage.trim();
      } catch {
        resources.memory.usage = 'Unable to determine memory usage';
      }

      // CPU usage
      try {
        const { stdout: cpuUsage } = await execAsync('top -l 1 -n 0 | grep "CPU usage"');
        resources.cpu.usage = cpuUsage.trim();
      } catch {
        resources.cpu.usage = 'Unable to determine CPU usage';
      }

      // Network connections
      try {
        const { stdout: established } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
        resources.network.established_connections = parseInt(established.trim()) || 0;
      } catch {
        resources.network.established_connections = 0;
      }

      try {
        const { stdout: listening } = await execAsync('lsof -i -P | grep LISTEN | wc -l');
        resources.network.listening_ports = parseInt(listening.trim()) || 0;
      } catch {
        resources.network.listening_ports = 0;
      }

      let result = '📊 System Resources:\n\n';
      result += `💾 Memory Pressure: ${resources.memory.pressure}\n`;
      result += `🧠 Memory Usage:\n${resources.memory.usage}\n\n`;
      result += `⚡ ${resources.cpu.usage}\n\n`;
      result += `🌐 Network:\n`;
      result += `  • Established connections: ${resources.network.established_connections}\n`;
      result += `  • Listening ports: ${resources.network.listening_ports}\n`;

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error getting system resources: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async killDevServers(serverType: string): Promise<ToolResult> {
    try {
      let patterns: string[] = [];
      
      if (serverType === 'all') {
        patterns = Object.values(this.SERVER_PATTERNS).flat();
      } else if (this.SERVER_PATTERNS[serverType as keyof typeof this.SERVER_PATTERNS]) {
        patterns = this.SERVER_PATTERNS[serverType as keyof typeof this.SERVER_PATTERNS];
      } else {
        return {
          content: [{
            type: 'text',
            text: `❌ Unknown server type: ${serverType}. Use: astro, npm, vite, next, or all`
          }],
          isError: true
        };
      }

      let result = `🔄 Killing ${serverType} development servers:\n\n`;
      let killedCount = 0;

      for (const pattern of patterns) {
        try {
          const { stdout } = await execAsync(`pkill -f "${pattern}"`);
          killedCount++;
          result += `✅ Killed processes matching: "${pattern}"\n`;
        } catch (error) {
          // pkill returns exit code 1 if no processes found, which is normal
          if (error instanceof Error && !error.message.includes('exit code 1')) {
            result += `⚠️ Error killing "${pattern}": ${error.message}\n`;
          }
        }
      }

      if (killedCount === 0) {
        result += `ℹ️ No ${serverType} development servers found running\n`;
      }

      result += `\n🔍 Waiting for process cleanup...`;
      
      // Wait for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      result += `\n✅ Development server cleanup complete`;

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error killing development servers: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async monitorPort(port: number, duration: number): Promise<ToolResult> {
    try {
      this.validatePort(port);
      
      let result = `👁️ Monitoring port ${port} for ${duration} seconds...\n\n`;
      const startTime = Date.now();
      const endTime = startTime + (duration * 1000);
      let lastStatus = '';

      while (Date.now() < endTime) {
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
          const timestamp = new Date().toLocaleTimeString();
          
          if (!stdout.trim()) {
            const currentStatus = `🟢 Available`;
            if (currentStatus !== lastStatus) {
              result += `[${timestamp}] Port ${port}: ${currentStatus}\n`;
              lastStatus = currentStatus;
            }
          } else {
            const lines = stdout.trim().split('\n');
            const processInfo = this.parseProcessInfo(lines);
            const currentStatus = `🔴 In-use (PID: ${processInfo[0]?.pid}, Process: ${processInfo[0]?.processName})`;
            
            if (currentStatus !== lastStatus) {
              result += `[${timestamp}] Port ${port}: ${currentStatus}\n`;
              lastStatus = currentStatus;
            }
          }
        } catch {
          const timestamp = new Date().toLocaleTimeString();
          const currentStatus = `🟢 Available`;
          if (currentStatus !== lastStatus) {
            result += `[${timestamp}] Port ${port}: ${currentStatus}\n`;
            lastStatus = currentStatus;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      }

      result += `\n✅ Monitoring completed for port ${port}`;

      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error monitoring port ${port}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private validatePort(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
    }
  }

  private parseProcessInfo(lines: string[]): Array<{ pid: number; processName: string; command: string }> {
    const processInfo: Array<{ pid: number; processName: string; command: string }> = [];
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const processName = parts[0];
        const pid = parseInt(parts[1]);
        const command = parts.slice(8).join(' ') || processName;
        
        if (!isNaN(pid)) {
          processInfo.push({ pid, processName, command });
        }
      }
    });
    
    return processInfo;
  }
}
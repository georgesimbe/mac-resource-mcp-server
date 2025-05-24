import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SessionManager, ProjectInfo } from './session-manager.js';

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
  private sessionManager: SessionManager;
  
  // Protected ports that should never be killed
  private readonly PROTECTED_PORTS = {
    // Database servers
    3306: 'MySQL',
    5432: 'PostgreSQL', 
    6379: 'Redis',
    27017: 'MongoDB',
    // Docker services
    2375: 'Docker daemon (unsecured)',
    2376: 'Docker daemon (secured)',
    2377: 'Docker Swarm',
    // Common system services
    22: 'SSH',
    80: 'HTTP',
    443: 'HTTPS',
    25: 'SMTP',
    53: 'DNS',
    // Development databases
    1433: 'SQL Server',
    5984: 'CouchDB',
    9200: 'Elasticsearch',
    8086: 'InfluxDB',
    // Message brokers
    5672: 'RabbitMQ',
    9092: 'Kafka'
  };
  
  // Patterns for critical services that should be protected
  private readonly PROTECTED_PROCESS_PATTERNS = [
    'docker',
    'dockerd', 
    'mysql',
    'mysqld',
    'postgres',
    'redis-server',
    'mongod',
    'elasticsearch',
    'rabbitmq',
    'kafka'
  ];
  
  private readonly SERVER_PATTERNS = {
    astro: ['astro dev', 'astro preview'],
    npm: ['npm run dev', 'npm start', 'npm run serve'],
    vite: ['vite', 'vite dev', 'vite serve'],
    next: ['next dev', 'next start'],
  };

  constructor() {
    this.sessionManager = new SessionManager();
    this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    try {
      await this.sessionManager.loadSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

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
      
      // Check if port is protected
      if (this.isProtectedPort(port)) {
        return {
          content: [{
            type: 'text',
            text: `🛡️ Port ${port} is protected (${this.PROTECTED_PORTS[port as keyof typeof this.PROTECTED_PORTS]}). Cannot kill processes on this port.`
          }],
          isError: true
        };
      }
      
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      
      if (!stdout.trim()) {
        return {
          content: [{
            type: 'text',
            text: `ℹ️ No processes found on port ${port}`
          }]
        };
      }

      // Check if any processes are critical services
      const processCheck = await this.checkForCriticalProcesses(port);
      if (processCheck.hasCritical) {
        return {
          content: [{
            type: 'text',
            text: `🛡️ Cannot kill port ${port}: Critical service detected (${processCheck.services.join(', ')}).\nUse 'list_protected_services' to see all protected services.`
          }],
          isError: true
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

  async listProtectedServices(): Promise<ToolResult> {
    try {
      let result = '🛡️ Protected Services Configuration:\n\n';
      
      result += '📋 Protected Ports:\n';
      Object.entries(this.PROTECTED_PORTS).forEach(([port, service]) => {
        result += `  • Port ${port}: ${service}\n`;
      });
      
      result += '\n🔒 Protected Process Patterns:\n';
      this.PROTECTED_PROCESS_PATTERNS.forEach(pattern => {
        result += `  • ${pattern}\n`;
      });
      
      result += '\n🔍 Currently Running Protected Services:\n';
      let foundProtected = false;
      
      for (const [port, service] of Object.entries(this.PROTECTED_PORTS)) {
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
          if (stdout.trim()) {
            foundProtected = true;
            result += `  • ${service} on port ${port} ✅\n`;
          }
        } catch {
          // Port not in use, which is fine
        }
      }
      
      if (!foundProtected) {
        result += '  • No protected services currently running\n';
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
          text: `❌ Error listing protected services: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async killDevServersSelective(): Promise<ToolResult> {
    try {
      let result = '🎯 Selective Development Server Cleanup:\n\n';
      let killedCount = 0;
      const checkedPorts = new Set<number>();
      
      // Check common dev ports and only kill non-critical services
      for (const port of this.COMMON_DEV_PORTS) {
        try {
          const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
          
          if (stdout.trim()) {
            const processCheck = await this.checkForCriticalProcesses(port);
            
            if (!processCheck.hasCritical && !this.isProtectedPort(port)) {
              try {
                const { stdout: pids } = await execAsync(`lsof -ti :${port}`);
                if (pids.trim()) {
                  await execAsync(`kill -TERM ${pids.trim().split('\n').join(' ')}`);
                  result += `✅ Cleaned port ${port}\n`;
                  killedCount++;
                  checkedPorts.add(port);
                }
              } catch {
                result += `⚠️ Could not clean port ${port}\n`;
              }
            } else {
              result += `🛡️ Skipped port ${port} (protected service: ${processCheck.services.join(', ')})\n`;
              checkedPorts.add(port);
            }
          }
        } catch {
          // Port not in use
        }
      }
      
      if (killedCount === 0) {
        result += 'ℹ️ No development servers found to clean up\n';
      } else {
        result += `\n🔍 Waiting for process cleanup...`;
        await new Promise(resolve => setTimeout(resolve, 2000));
        result += `\n✅ Cleaned ${killedCount} development servers`;
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
          text: `❌ Error during selective cleanup: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async addProject(name: string, directory: string, ports: number[], framework: string): Promise<ToolResult> {
    try {
      await this.sessionManager.addProject(name, directory, ports, framework);
      
      return {
        content: [{
          type: 'text',
          text: `✅ Added project "${name}" with ports [${ports.join(', ')}] using ${framework} framework`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error adding project: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async listActiveProjects(): Promise<ToolResult> {
    try {
      const projects = this.sessionManager.getActiveProjects();
      
      if (projects.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'ℹ️ No active projects found. Use "add_project" to register your current projects.'
          }]
        };
      }

      let result = '📋 Active Projects:\n\n';
      
      for (const project of projects) {
        const lastActive = new Date(project.lastActive).toLocaleString();
        result += `🚀 ${project.name} (${project.framework})\n`;
        result += `   📁 ${project.directory}\n`;
        result += `   🔌 Ports: ${project.ports.join(', ')}\n`;
        result += `   ⏰ Last active: ${lastActive}\n\n`;
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
          text: `❌ Error listing projects: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async killProjectPorts(projectName: string): Promise<ToolResult> {
    try {
      const projects = this.sessionManager.getActiveProjects();
      const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
      
      if (!project) {
        return {
          content: [{
            type: 'text',
            text: `❌ Project "${projectName}" not found. Use "list_active_projects" to see available projects.`
          }],
          isError: true
        };
      }

      let result = `🎯 Killing ports for project "${project.name}":\n\n`;
      let killedCount = 0;

      for (const port of project.ports) {
        if (this.isProtectedPort(port)) {
          result += `🛡️ Skipped port ${port} (protected)\n`;
          continue;
        }

        const processCheck = await this.checkForCriticalProcesses(port);
        if (processCheck.hasCritical) {
          result += `🛡️ Skipped port ${port} (critical service: ${processCheck.services.join(', ')})\n`;
          continue;
        }

        try {
          const { stdout } = await execAsync(`lsof -ti :${port}`);
          if (stdout.trim()) {
            await execAsync(`kill -TERM ${stdout.trim().split('\n').join(' ')}`);
            result += `✅ Killed processes on port ${port}\n`;
            killedCount++;
          } else {
            result += `ℹ️ Port ${port} already available\n`;
          }
        } catch {
          result += `⚠️ Could not kill port ${port}\n`;
        }
      }

      if (killedCount > 0) {
        result += `\n🔄 Waiting for cleanup...`;
        await new Promise(resolve => setTimeout(resolve, 2000));
        result += `\n✅ Freed ${killedCount} ports for project "${project.name}"`;
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
          text: `❌ Error killing project ports: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async addCustomProtectedPort(port: number, service: string): Promise<ToolResult> {
    try {
      this.validatePort(port);
      await this.sessionManager.addProtectedPort(port, service);
      
      return {
        content: [{
          type: 'text',
          text: `🛡️ Added port ${port} to protected services as "${service}"`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error adding protected port: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private isProtectedPort(port: number): boolean {
    const customProtected = this.sessionManager.getProtectedPorts();
    return port in this.PROTECTED_PORTS || customProtected.includes(port);
  }
  
  private async checkForCriticalProcesses(port: number): Promise<{ hasCritical: boolean; services: string[] }> {
    try {
      const { stdout } = await execAsync(`lsof -i :${port} -P -n`);
      const lines = stdout.trim().split('\n');
      const processInfo = this.parseProcessInfo(lines);
      
      const criticalServices: string[] = [];
      
      for (const info of processInfo) {
        const processName = info.processName.toLowerCase();
        const command = info.command.toLowerCase();
        
        for (const pattern of this.PROTECTED_PROCESS_PATTERNS) {
          if (processName.includes(pattern) || command.includes(pattern)) {
            criticalServices.push(info.processName);
            break;
          }
        }
      }
      
      return {
        hasCritical: criticalServices.length > 0,
        services: [...new Set(criticalServices)]
      };
    } catch {
      return { hasCritical: false, services: [] };
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
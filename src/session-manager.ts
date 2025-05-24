import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface SessionData {
  activeProjects: ProjectInfo[];
  protectedPorts: number[];
  lastActivity: number;
  customProtectedServices: { [port: number]: string };
}

export interface ProjectInfo {
  name: string;
  directory: string;
  ports: number[];
  framework: string;
  lastActive: number;
}

export class SessionManager {
  private readonly sessionPath: string;
  private sessionData: SessionData;

  constructor() {
    this.sessionPath = join(homedir(), '.mac-resource-mcp', 'session.json');
    this.sessionData = {
      activeProjects: [],
      protectedPorts: [],
      lastActivity: Date.now(),
      customProtectedServices: {}
    };
  }

  async loadSession(): Promise<SessionData> {
    try {
      await fs.mkdir(join(homedir(), '.mac-resource-mcp'), { recursive: true });
      const data = await fs.readFile(this.sessionPath, 'utf-8');
      this.sessionData = JSON.parse(data);
      
      // Clean up old projects (older than 24 hours)
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      this.sessionData.activeProjects = this.sessionData.activeProjects.filter(
        project => project.lastActive > dayAgo
      );
      
      return this.sessionData;
    } catch {
      // File doesn't exist or is corrupted, start fresh
      await this.saveSession();
      return this.sessionData;
    }
  }

  async saveSession(): Promise<void> {
    try {
      await fs.mkdir(join(homedir(), '.mac-resource-mcp'), { recursive: true });
      this.sessionData.lastActivity = Date.now();
      await fs.writeFile(this.sessionPath, JSON.stringify(this.sessionData, null, 2));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  async addProject(name: string, directory: string, ports: number[], framework: string): Promise<void> {
    const existingIndex = this.sessionData.activeProjects.findIndex(p => p.directory === directory);
    
    const projectInfo: ProjectInfo = {
      name,
      directory,
      ports,
      framework,
      lastActive: Date.now()
    };

    if (existingIndex >= 0) {
      this.sessionData.activeProjects[existingIndex] = projectInfo;
    } else {
      this.sessionData.activeProjects.push(projectInfo);
    }

    await this.saveSession();
  }

  async removeProject(directory: string): Promise<void> {
    this.sessionData.activeProjects = this.sessionData.activeProjects.filter(
      p => p.directory !== directory
    );
    await this.saveSession();
  }

  async addProtectedPort(port: number, service: string): Promise<void> {
    if (!this.sessionData.protectedPorts.includes(port)) {
      this.sessionData.protectedPorts.push(port);
    }
    this.sessionData.customProtectedServices[port] = service;
    await this.saveSession();
  }

  async removeProtectedPort(port: number): Promise<void> {
    this.sessionData.protectedPorts = this.sessionData.protectedPorts.filter(p => p !== port);
    delete this.sessionData.customProtectedServices[port];
    await this.saveSession();
  }

  getActiveProjects(): ProjectInfo[] {
    return this.sessionData.activeProjects;
  }

  getProtectedPorts(): number[] {
    return [...this.sessionData.protectedPorts];
  }

  getCustomProtectedServices(): { [port: number]: string } {
    return { ...this.sessionData.customProtectedServices };
  }

  async touchProject(directory: string): Promise<void> {
    const project = this.sessionData.activeProjects.find(p => p.directory === directory);
    if (project) {
      project.lastActive = Date.now();
      await this.saveSession();
    }
  }

  async getProjectPorts(directory: string): Promise<number[]> {
    const project = this.sessionData.activeProjects.find(p => p.directory === directory);
    return project ? project.ports : [];
  }
}
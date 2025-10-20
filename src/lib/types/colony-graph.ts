export interface ColonyServer {
  id: string;
  name: string;
  host: string;
  port: string;
  status: 'online' | 'offline' | 'connecting';
  position?: { x: number; y: number };
  processCount?: number;
  lastSeen?: Date;
}

export interface ColonyExecutor {
  id: string;
  name: string;
  serverId: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  capabilities: string[];
  position?: { x: number; y: number };
  currentProcess?: string;
  lastActivity?: Date;
  processCount?: number;
}

export interface ColonyConnection {
  id: string;
  source: string; // server or executor id
  target: string; // server or executor id
  type: 'server-executor' | 'job-flow';
  weight?: number;
}

export interface ActiveJob {
  id: string;
  serverId: string;
  executorId: string;
  status: 'queued' | 'assigned' | 'running' | 'completed' | 'failed';
  functionName: string;
  startTime: Date;
  endTime?: Date;
  progress?: number;
}

export interface JobFlowAnimation {
  id: string;
  jobId: string;
  fromId: string;
  toId: string;
  startTime: number;
  duration: number;
  type: 'assignment' | 'completion' | 'failure';
}

export interface ColonyGraphData {
  servers: ColonyServer[];
  executors: ColonyExecutor[];
  connections: ColonyConnection[];
  activeJobs: ActiveJob[];
  animations: JobFlowAnimation[];
}

export interface GraphNode {
  id: string;
  type: 'server' | 'executor';
  data: ColonyServer | ColonyExecutor;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: GraphNode | string;
  target: GraphNode | string;
  type: 'server-executor' | 'job-flow';
  weight?: number;
}

export interface GraphDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface GraphOptions {
  forceStrength: number;
  linkDistance: number;
  chargeStrength: number;
  collisionRadius: number;
  animationSpeed: number;
  showLabels: boolean;
  showConnections: boolean;
  filterOfflineNodes: boolean;
}
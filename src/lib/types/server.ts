export interface ServerStats {
  colonies: number;
  executors: number;
  waitingProcesses: number;
  runningProcesses: number;
  successfulProcesses: number;
  failedProcesses: number;
  waitingWorkflows: number;
  runningWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
}

export interface ServerStatus {
  serverVersion: string;
  serverPort: string;
  serverHost: string;
  serverBuildtime: string;
  cliVersion: string;
  cliBuildtime: string;
}
// Types for colony overview visualization

export interface ColonyOverviewData {
	colonyName: string;
	executors: ExecutorNode[];
	processes: ProcessInfo[];
	statistics: ColonyStatistics;
	totalExecutors: number;
	activeExecutors: number;
	idleExecutors: number;
}

export interface ExecutorNode {
	id: string;
	name: string;
	type: string;
	state: 'idle' | 'busy' | 'offline';
	colonyName: string;
	lastSeen?: string;
	// Additional fields from API response
	cpu?: string;
	memory?: string;
	capabilities?: string[];
	// Process assignment tracking
	assignedProcesses?: number;
	runningProcesses?: number;
}

export interface ProcessInfo {
	id: string;
	functionName: string;
	state: number;
	executorId?: string;
	executorName?: string;
	submissionTime?: string;
	startTime?: string;
	endTime?: string;
}

export interface ColonyStatistics {
	totalProcesses: number;
	waitingProcesses: number;
	runningProcesses: number;
	successfulProcesses: number;
	failedProcesses: number;
}

export interface ServerNode {
	id: string;
	name: string;
	status: 'online' | 'offline' | 'error';
	executors: ExecutorNode[];
}

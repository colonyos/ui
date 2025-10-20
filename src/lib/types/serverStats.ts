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

export interface ServerStatItem {
	label: string;
	value: number;
	color: string;
	category: 'general' | 'processes' | 'workflows';
}

export function formatServerStats(stats: ServerStats): ServerStatItem[] {
	return [
		{
			label: 'Colonies',
			value: stats.colonies,
			color: 'text-blue-600 bg-blue-100',
			category: 'general'
		},
		{
			label: 'Executors',
			value: stats.executors,
			color: 'text-purple-600 bg-purple-100',
			category: 'general'
		},
		{
			label: 'Waiting Processes',
			value: stats.waitingProcesses,
			color: 'text-yellow-600 bg-yellow-100',
			category: 'processes'
		},
		{
			label: 'Running Processes',
			value: stats.runningProcesses,
			color: 'text-blue-600 bg-blue-100',
			category: 'processes'
		},
		{
			label: 'Successful Processes',
			value: stats.successfulProcesses,
			color: 'text-green-600 bg-green-100',
			category: 'processes'
		},
		{
			label: 'Failed Processes',
			value: stats.failedProcesses,
			color: 'text-red-600 bg-red-100',
			category: 'processes'
		},
		{
			label: 'Waiting Workflows',
			value: stats.waitingWorkflows,
			color: 'text-yellow-600 bg-yellow-100',
			category: 'workflows'
		},
		{
			label: 'Running Workflows',
			value: stats.runningWorkflows,
			color: 'text-blue-600 bg-blue-100',
			category: 'workflows'
		},
		{
			label: 'Successful Workflows',
			value: stats.successfulWorkflows,
			color: 'text-green-600 bg-green-100',
			category: 'workflows'
		},
		{
			label: 'Failed Workflows',
			value: stats.failedWorkflows,
			color: 'text-red-600 bg-red-100',
			category: 'workflows'
		}
	];
}

export function getTotalProcesses(stats: ServerStats): number {
	return stats.waitingProcesses + stats.runningProcesses + stats.successfulProcesses + stats.failedProcesses;
}

export function getTotalWorkflows(stats: ServerStats): number {
	return stats.waitingWorkflows + stats.runningWorkflows + stats.successfulWorkflows + stats.failedWorkflows;
}
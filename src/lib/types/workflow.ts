import { ProcessState, getProcessStateLabel, getProcessStateColor } from './process';

export interface Workflow {
	processgraphid: string;
	initiatorid: string;
	initiatorname: string;
	colonyname: string;
	state: number;
	submissiontime: string;
	starttime: string;
	endtime: string;
	processs?: string[]; // Array of process IDs in the workflow
	[key: string]: any;
}

// Re-export process state utilities since workflows use the same states
export { ProcessState, getProcessStateLabel, getProcessStateColor };

export function formatWorkflowDuration(startTime: string, endTime: string): string {
	if (!startTime || startTime === '0001-01-01T00:00:00Z') {
		return 'Not started';
	}

	const start = new Date(startTime).getTime();

	if (!endTime || endTime === '0001-01-01T00:00:00Z') {
		// Still running - calculate duration from start to now
		const now = Date.now();
		const durationMs = now - start;
		return formatDuration(durationMs);
	}

	const end = new Date(endTime).getTime();
	const durationMs = end - start;
	return formatDuration(durationMs);
}

function formatDuration(durationMs: number): string {
	if (durationMs < 0) return '0s';

	const seconds = Math.floor(durationMs / 1000);

	if (seconds < 60) {
		return `${seconds}s`;
	} else if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	} else if (seconds < 86400) {
		const hours = Math.floor(seconds / 3600);
		const remainingMinutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${remainingMinutes}m`;
	} else {
		const days = Math.floor(seconds / 86400);
		const remainingHours = Math.floor((seconds % 86400) / 3600);
		return `${days}d ${remainingHours}h`;
	}
}

export function formatWorkflowTime(timeString: string): string {
	if (!timeString || timeString === '0001-01-01T00:00:00Z') {
		return 'Never';
	}

	try {
		return new Date(timeString).toLocaleString();
	} catch {
		return timeString;
	}
}
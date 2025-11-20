export interface Function {
	functionid: string;
	executorname: string;
	executortype: string;
	colonyname: string;
	funcname: string;
	counter: number;
	minwaittime: number;
	maxwaittime: number;
	minexectime: number;
	maxexectime: number;
	avgwaittime: number;
	avgexectime: number;
}

// API response interface (camelCase from server - actual format)
export interface ApiFunctionResponse {
	functionid?: string;
	executorname?: string;
	executortype?: string;
	colonyname?: string;
	funcname?: string;
	counter?: number;
	minwaittime?: number;
	maxwaittime?: number;
	minexectime?: number;
	maxexectime?: number;
	avgwaittime?: number;
	avgexectime?: number;
}

// Helper function to convert API response to Function interface
export function convertApiFunction(apiFunc: ApiFunctionResponse): Function {
	return {
		functionid: apiFunc.functionid || '',
		executorname: apiFunc.executorname || 'Unknown',
		executortype: apiFunc.executortype || 'unknown',
		colonyname: apiFunc.colonyname || '',
		funcname: apiFunc.funcname || 'Unknown',
		counter: apiFunc.counter || 0,
		minwaittime: apiFunc.minwaittime || 0,
		maxwaittime: apiFunc.maxwaittime || 0,
		minexectime: apiFunc.minexectime || 0,
		maxexectime: apiFunc.maxexectime || 0,
		avgwaittime: apiFunc.avgwaittime || 0,
		avgexectime: apiFunc.avgexectime || 0
	};
}

export function formatDuration(seconds: number): string {
	if (seconds < 1) {
		return `${(seconds * 1000).toFixed(0)}ms`;
	} else if (seconds < 60) {
		return `${seconds.toFixed(2)}s`;
	} else if (seconds < 3600) {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
	} else {
		const hours = Math.floor(seconds / 3600);
		const remainingMinutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${remainingMinutes}m`;
	}
}
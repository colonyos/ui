export interface Generator {
	generatorid: string;
	initiatorid: string;
	initiatorname: string;
	colonyname: string;
	name: string;
	workflowspec: string;
	trigger: number;
	timeout: number;
	firstpack: string;
	lastrun: string;
	queuesize: number;
	checkerperiod: number;
}

export function getGeneratorTriggerLabel(trigger: number): string {
	return trigger.toString();
}

export function getGeneratorTriggerColor(trigger: number): string {
	return 'text-blue-600 bg-blue-100';
}

export function getGeneratorStatus(lastrun: string, timeout: number): { label: string; color: string } {
	if (!lastrun || lastrun === '0001-01-01T00:00:00Z' || lastrun.startsWith('0001-01-01T00:')) {
		return { label: 'Not run', color: 'text-gray-600 bg-gray-100' };
	}
	
	const lastRunDate = new Date(lastrun);
	const now = new Date();
	const diffMs = now.getTime() - lastRunDate.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	
	if (timeout > 0 && diffSeconds > timeout) {
		return { label: 'Timeout', color: 'text-red-600 bg-red-100' };
	} else if (diffSeconds < 300) { // Active within last 5 minutes
		return { label: 'Active', color: 'text-green-600 bg-green-100' };
	} else if (diffSeconds < 3600) { // Idle within last hour
		return { label: 'Idle', color: 'text-yellow-600 bg-yellow-100' };
	} else {
		return { label: 'Inactive', color: 'text-gray-600 bg-gray-100' };
	}
}
export function formatDate(dateString: string): string {
	if (!dateString || dateString === '0001-01-01T00:00:00Z' || dateString === '0001-01-01T00:53:28+00:53') {
		return 'Not set';
	}
	return new Date(dateString).toLocaleString();
}

export function formatDuration(startTime: string, endTime: string): string {
	if (!startTime || startTime === '0001-01-01T00:00:00Z' || startTime === '0001-01-01T00:53:28+00:53') {
		return 'Not started';
	}

	const start = new Date(startTime);
	let end: Date;

	if (!endTime || endTime === '0001-01-01T00:00:00Z' || endTime === '0001-01-01T00:53:28+00:53') {
		end = new Date(); // Still running
	} else {
		end = new Date(endTime);
	}

	const diffMs = end.getTime() - start.getTime();
	const hours = Math.floor(diffMs / (1000 * 60 * 60));
	const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	} else {
		return `${seconds}s`;
	}
}

export function isValidDate(dateString: string): boolean {
	return dateString &&
		   dateString !== '0001-01-01T00:00:00Z' &&
		   dateString !== '0001-01-01T00:53:28+00:53';
}
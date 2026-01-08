<script lang="ts">
	import type { Cron } from '$lib/types/cron';

	interface Props {
		crons: Cron[];
		onCronClick?: (cron: Cron) => void;
		onRunCron?: (cronId: string) => void;
		loading?: boolean;
	}

	let { crons, onCronClick, onRunCron, loading = false }: Props = $props();

	// Memoize date formatting functions to avoid recalculation on every render
	const formatDateMemo = new Map<string, string>();
	const formatNextRunMemo = new Map<string, { result: string; timestamp: number }>();
	const statusColorMemo = new Map<string, { result: string; timestamp: number }>();

	function formatDate(dateString: string): string {
		if (formatDateMemo.has(dateString)) {
			return formatDateMemo.get(dateString)!;
		}

		let result: string;
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			result = 'Never';
		} else {
			result = new Date(dateString).toLocaleString();
		}
		
		formatDateMemo.set(dateString, result);
		return result;
	}

	function formatNextRun(dateString: string): string {
		const now = Date.now();
		const cached = formatNextRunMemo.get(dateString);
		
		// Cache for 1 minute since this is time-sensitive
		if (cached && (now - cached.timestamp) < 60000) {
			return cached.result;
		}

		let result: string;
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			result = 'Not scheduled';
		} else {
			const date = new Date(dateString);
			const diff = date.getTime() - now;
			
			if (diff < 0) {
				result = 'Overdue';
			} else {
				const hours = Math.floor(diff / (1000 * 60 * 60));
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
				
				if (hours > 24) {
					const days = Math.floor(hours / 24);
					result = `In ${days}d ${hours % 24}h`;
				} else if (hours > 0) {
					result = `In ${hours}h ${minutes}m`;
				} else {
					result = `In ${minutes}m`;
				}
			}
		}
		
		formatNextRunMemo.set(dateString, { result, timestamp: now });
		return result;
	}

	function getStatusColor(nextrun: string): string {
		const now = Date.now();
		const cached = statusColorMemo.get(nextrun);
		
		// Cache for 1 minute since this is time-sensitive
		if (cached && (now - cached.timestamp) < 60000) {
			return cached.result;
		}

		let result: string;
		if (!nextrun || nextrun === '0001-01-01T00:00:00Z') {
			result = 'text-gray-600 bg-gray-100';
		} else {
			const date = new Date(nextrun);
			const diff = date.getTime() - now;
			
			if (diff < 0) {
				result = 'text-red-600 bg-red-100';
			} else if (diff < 3600000) { // Less than 1 hour
				result = 'text-orange-600 bg-orange-100';
			} else {
				result = 'text-green-600 bg-green-100';
			}
		}
		
		statusColorMemo.set(nextrun, { result, timestamp: now });
		return result;
	}
</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="table-header-cell">
					Cron Job
				</th>
				<th class="table-header-cell">
					Schedule
				</th>
				<th class="table-header-cell">
					Next Run
				</th>
				<th class="table-header-cell">
					Last Run
				</th>
				<th class="table-header-cell">
					Initiator
				</th>
				<th class="table-header-cell">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each crons as cron (cron.cronid)}
				<tr
					class="table-row {onCronClick ? 'cursor-pointer' : ''}"
					onclick={() => onCronClick?.(cron)}
				>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{cron.name}</div>
							<div class="text-sm text-gray-500 dark:text-slate-300">{cron.cronid}</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{cron.colonyname}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							<div class="font-mono">{cron.cronexpression}</div>
							{#if cron.interval > 0}
								<div class="text-xs text-gray-500 dark:text-slate-300">Interval: {cron.interval}s</div>
							{/if}
							{#if cron.random}
								<div class="text-xs text-orange-500">Random timing enabled</div>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(
								cron.nextrun
							)}"
						>
							{formatNextRun(cron.nextrun)}
						</span>
						<div class="text-xs text-gray-500 dark:text-slate-300 mt-1">{formatDate(cron.nextrun)}</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{formatDate(cron.lastrun)}
					</td>
					<td class="px-6 py-4">
						<div class="text-sm text-gray-900 dark:text-slate-100 truncate max-w-32">{cron.initiatorname}</div>
						<div class="text-xs text-gray-500 dark:text-slate-300 truncate max-w-32 font-mono" title={cron.initiatorid}>
							{cron.initiatorid}
						</div>
					</td>

					<!-- Actions -->
					<td class="px-6 py-4 whitespace-nowrap">
						{#if onRunCron}
							<button
								onclick={(e) => {
									e.stopPropagation();
									onRunCron(cron.cronid);
								}}
								class="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors"
								title="Run this cron job now"
							>
								▶ Run Now
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if crons.length === 0}
		<div class="table-empty">
			{#if loading}
				Loading cron jobs...
			{:else}
				No cron jobs found
			{/if}
		</div>
	{/if}
</div>
<script lang="ts">
	import type { Function } from '$lib/types/function';
	import { formatDuration, getPerformanceColor } from '$lib/types/function';

	interface Props {
		functions: Function[];
	}

	let { functions }: Props = $props();

	// Hash function to generate a consistent number from a string
	function hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	// Generate color style based on executor type hash
	function getExecutorTypeStyle(type: string | undefined): string {
		if (!type) {
			return '--badge-hue: 0;';
		}

		// Generate hue from hash (0-360 degrees)
		const hash = hashString(type.toLowerCase());
		const hue = hash % 360;

		// Set CSS custom property for the hue
		// Light mode colors will be set via inline style
		// Dark mode colors will be set via CSS using this variable
		return `--badge-hue: ${hue}; background-color: hsl(${hue}, 65%, 85%); color: hsl(${hue}, 70%, 30%);`;
	}

	function getThroughputColor(counter: number): string {
		if (counter >= 1000) return 'text-green-600 dark:text-green-400 font-semibold';
		if (counter >= 100) return 'text-blue-600 dark:text-blue-400 font-medium';
		if (counter >= 10) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-gray-600 dark:text-slate-300';
	}

</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Function
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Executor
				</th>
				<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Executions
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Wait Time
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Execution Time
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each functions as func}
				<tr class="table-row dark:hover:bg-slate-600">
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{func.funcname}</div>
							<div class="text-xs text-gray-500 dark:text-slate-300 dark:text-slate-300">{func.functionid}</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{func.colonyname}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{func.executorname}</div>
							<span
								class="executor-type-badge inline-flex px-2 py-1 text-xs font-semibold rounded-full"
								style={getExecutorTypeStyle(func.executortype)}
							>
								{func.executortype}
							</span>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-center">
						<span class="text-2xl font-bold {getThroughputColor(func.counter)}">
							{func.counter.toLocaleString()}
						</span>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm space-y-1">
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-slate-300 dark:text-slate-300">Avg:</span>
								<span
									class="font-medium {getPerformanceColor(
										func.avgwaittime,
										func.minwaittime,
										func.maxwaittime
									)}"
								>
									{formatDuration(func.avgwaittime)}
								</span>
							</div>
							<div class="flex justify-between text-xs text-gray-400 dark:text-slate-400">
								<span>Min: {formatDuration(func.minwaittime)}</span>
								<span>Max: {formatDuration(func.maxwaittime)}</span>
							</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm space-y-1">
							<div class="flex justify-between">
								<span class="text-gray-500 dark:text-slate-300 dark:text-slate-300">Avg:</span>
								<span
									class="font-medium {getPerformanceColor(
										func.avgexectime,
										func.minexectime,
										func.maxexectime
									)}"
								>
									{formatDuration(func.avgexectime)}
								</span>
							</div>
							<div class="flex justify-between text-xs text-gray-400 dark:text-slate-400">
								<span>Min: {formatDuration(func.minexectime)}</span>
								<span>Max: {formatDuration(func.maxexectime)}</span>
							</div>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if functions.length === 0}
		<div class="text-center py-8 text-gray-500 dark:text-slate-300 dark:text-slate-300">No functions found</div>
	{/if}
</div>

<style>
	/* Dark mode styling for executor type badges using CSS custom property */
	:global(.dark) .executor-type-badge {
		background-color: hsl(var(--badge-hue, 0), 50%, 25%) !important;
		color: hsl(var(--badge-hue, 0), 60%, 75%) !important;
	}
</style>
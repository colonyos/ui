<script lang="ts">
	import type { Generator } from '$lib/types/generator';
	import { getGeneratorTriggerLabel, getGeneratorTriggerColor, getGeneratorStatus } from '$lib/types/generator';

	interface Props {
		generators: Generator[];
		onGeneratorClick?: (generator: Generator) => void;
	}

	let { generators, onGeneratorClick }: Props = $props();

	function formatDate(dateString: string): string {
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			return 'Never';
		}
		return new Date(dateString).toLocaleString();
	}

	function formatDuration(seconds: number): string {
		if (seconds === 0) return 'No timeout';
		
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}

	function formatCheckerPeriod(seconds: number): string {
		if (seconds < 60) {
			return `${seconds}s`;
		} else if (seconds < 3600) {
			return `${Math.floor(seconds / 60)}m`;
		} else {
			return `${Math.floor(seconds / 3600)}h`;
		}
	}

	function getQueueStatus(queueSize: number): { label: string; color: string } {
		if (queueSize === 0) {
			return { label: 'Empty', color: 'text-gray-600 bg-gray-100' };
		} else if (queueSize < 10) {
			return { label: 'Low', color: 'text-green-600 bg-green-100' };
		} else if (queueSize < 50) {
			return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
		} else {
			return { label: 'High', color: 'text-red-600 bg-red-100' };
		}
	}

	function getUptime(firstpack: string): string {
		if (!firstpack || firstpack === '0001-01-01T00:00:00Z') {
			return 'Not started';
		}
		
		const firstDate = new Date(firstpack);
		const now = new Date();
		const diffMs = now.getTime() - firstDate.getTime();
		const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (days === 0) {
			const hours = Math.floor(diffMs / (1000 * 60 * 60));
			return `${hours}h`;
		} else {
			return `${days}d`;
		}
	}

	function parseWorkflowSpec(spec: string): { taskCount: number; functions: string[] } {
		try {
			const parsed = JSON.parse(spec);
			const tasks = parsed.tasks || [];
			return {
				taskCount: tasks.length,
				functions: tasks.map((task: any) => task.function || 'unknown')
			};
		} catch {
			return { taskCount: 0, functions: [] };
		}
	}
</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Generator
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Status
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Trigger
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Queue
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Workflow
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Timing
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
					Last Activity
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each generators as generator}
				{@const status = getGeneratorStatus(generator.lastrun, generator.timeout)}
				{@const queueStatus = getQueueStatus(generator.queuesize)}
				{@const workflow = parseWorkflowSpec(generator.workflowspec)}
				<tr
					class="table-row {onGeneratorClick ? 'cursor-pointer' : ''}"
					onclick={() => onGeneratorClick?.(generator)}
				>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{generator.name}</div>
							<div class="text-sm text-gray-500 dark:text-slate-300 dark:text-slate-300">{generator.generatorid}</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{generator.initiatorname}</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{generator.colonyname}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {status.color}"
						>
							{status.label}
						</span>
						<div class="text-xs text-gray-500 dark:text-slate-300 mt-1">
							Uptime: {getUptime(generator.firstpack)}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getGeneratorTriggerColor(
								generator.trigger
							)}"
						>
							{getGeneratorTriggerLabel(generator.trigger)}
						</span>
						<div class="text-xs text-gray-500 dark:text-slate-300 mt-1">
							Check: {formatCheckerPeriod(generator.checkerperiod)}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{generator.queuesize}</div>
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {queueStatus.color}"
						>
							{queueStatus.label}
						</span>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							<div>{workflow.taskCount} task{workflow.taskCount !== 1 ? 's' : ''}</div>
							<div class="text-xs text-gray-500 dark:text-slate-300 mt-1">
								{#each workflow.functions.slice(0, 2) as func, index}
									{func}{index < Math.min(workflow.functions.length - 1, 1) ? ', ' : ''}
								{/each}
								{#if workflow.functions.length > 2}
									<span class="text-gray-400 dark:text-slate-400">+{workflow.functions.length - 2} more</span>
								{/if}
							</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							<div class="text-xs text-gray-500 dark:text-slate-300 dark:text-slate-300">Timeout:</div>
							<div>{formatDuration(generator.timeout)}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							<div class="text-xs text-gray-500 dark:text-slate-300 dark:text-slate-300">Last run:</div>
							<div>{formatDate(generator.lastrun)}</div>
						</div>
						<div class="text-xs text-gray-400 mt-1">
							Started: {formatDate(generator.firstpack)}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if generators.length === 0}
		<div class="text-center py-8 text-gray-500 dark:text-slate-300 dark:text-slate-300">No generators found</div>
	{/if}
</div>
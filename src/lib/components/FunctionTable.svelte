<script lang="ts">
	import type { Function } from '$lib/types/function';
	import { formatDuration, getPerformanceColor } from '$lib/types/function';

	interface Props {
		functions: Function[];
	}

	let { functions }: Props = $props();

	function getExecutorTypeColor(type: string | undefined): string {
		if (!type) {
			return 'bg-gray-100 text-gray-800'; // Default color for undefined/null types
		}
		switch (type.toLowerCase()) {
			case 'container':
				return 'bg-blue-100 text-blue-800';
			case 'kubernetes':
			case 'ice-kubeexecutor':
				return 'bg-purple-100 text-purple-800';
			case 'hpc':
				return 'bg-green-100 text-green-800';
			case 'vm':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getThroughputColor(counter: number): string {
		if (counter >= 1000) return 'text-green-600 font-semibold';
		if (counter >= 100) return 'text-blue-600 font-medium';
		if (counter >= 10) return 'text-yellow-600';
		return 'text-gray-600';
	}

</script>

<div class="overflow-x-auto bg-white shadow-md rounded-lg">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Function
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Executor
				</th>
				<th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
					Executions
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Wait Time
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Execution Time
				</th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each functions as func}
				<tr class="hover:bg-gray-50">
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900">{func.funcname}</div>
							<div class="text-xs text-gray-500">{func.functionid}</div>
							<div class="text-xs text-gray-400">{func.colonyname}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900">{func.executorname}</div>
							<span
								class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getExecutorTypeColor(
									func.executortype
								)}"
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
								<span class="text-gray-500">Avg:</span>
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
							<div class="flex justify-between text-xs text-gray-400">
								<span>Min: {formatDuration(func.minwaittime)}</span>
								<span>Max: {formatDuration(func.maxwaittime)}</span>
							</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm space-y-1">
							<div class="flex justify-between">
								<span class="text-gray-500">Avg:</span>
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
							<div class="flex justify-between text-xs text-gray-400">
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
		<div class="text-center py-8 text-gray-500">No functions found</div>
	{/if}
</div>
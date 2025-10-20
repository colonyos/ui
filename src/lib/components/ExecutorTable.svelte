<script lang="ts">
	import type { Executor } from '$lib/types/executor';
	import { getExecutorStateLabel, getExecutorStateColor } from '$lib/types/executor';

	interface Props {
		executors: Executor[];
		onExecutorClick?: (executor: Executor) => void;
	}

	let { executors, onExecutorClick }: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}

	function calculateTotalProjects(executor: Executor): number {
		return Object.keys(executor.allocations.projects).length;
	}

</script>

<div class="overflow-x-auto bg-white shadow-md rounded-lg">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Executor
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Status
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Hardware
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Projects
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Last Heard
				</th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each executors as executor (executor.executorid)}
				<tr class="hover:bg-gray-50 {onExecutorClick ? 'cursor-pointer' : ''}"
					onclick={() => onExecutorClick?.(executor)}>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900">{executor.executorname}</div>
							<div class="text-sm text-gray-500">{executor.executorid}</div>
							<div class="text-xs text-gray-400">{executor.executortype}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getExecutorStateColor(
								executor.state
							)}"
						>
							{getExecutorStateLabel(executor.state)}
						</span>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900">
							<div>{executor.capabilities.hardware.model}</div>
							<div class="text-xs text-gray-500">
								{executor.capabilities.hardware.nodes} nodes • {executor.capabilities.hardware.cpu}
							</div>
							<div class="text-xs text-gray-500">
								RAM: {executor.capabilities.hardware.mem} • Storage: {executor.capabilities.hardware
									.storage}
							</div>
							{#if executor.capabilities.hardware.gpu.count > 0}
								<div class="text-xs text-gray-500">
									GPU: {executor.capabilities.hardware.gpu.count}x {executor.capabilities.hardware
										.gpu.name} ({executor.capabilities.hardware.gpu.mem})
								</div>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
						{calculateTotalProjects(executor)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
						{formatDate(executor.lastheardfromtime)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if executors.length === 0}
		<div class="text-center py-8 text-gray-500">No executors found</div>
	{/if}
</div>
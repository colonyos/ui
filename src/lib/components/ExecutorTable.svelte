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

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="table-header-cell">
					Executor
				</th>
				<th class="table-header-cell">
					Status
				</th>
				<th class="table-header-cell">
					Hardware
				</th>
				<th class="table-header-cell">
					Projects
				</th>
				<th class="table-header-cell">
					Last Heard
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each executors as executor (executor.executorid)}
				{@const hw = executor.capabilities?.hardware}
				{@const hasNodes = hw?.nodes}
				{@const hasCpu = hw?.cpu && hw.cpu !== ''}
				{@const hasMem = hw?.mem && hw.mem !== ''}
				{@const hasStorage = hw?.storage && hw.storage !== ''}
				<tr class="table-row {onExecutorClick ? 'cursor-pointer' : ''}"
					onclick={() => onExecutorClick?.(executor)}>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{executor.executorname}</div>
							<div class="text-sm text-gray-500 dark:text-slate-300">{executor.executorid}</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{executor.executortype}</div>
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
						<div class="text-sm text-gray-900 dark:text-slate-100">
							{#if hw?.model && hw.model !== ''}
								<div>{hw.model}</div>
							{/if}
							{#if hasNodes || hasCpu}
								<div class="text-xs text-gray-500 dark:text-slate-300">
									{#if hasNodes}{hw.nodes} nodes{/if}{#if hasNodes && hasCpu} • {/if}{#if hasCpu}{hw.cpu}{/if}
								</div>
							{/if}
							{#if hasMem || hasStorage}
								<div class="text-xs text-gray-500 dark:text-slate-300">
									{#if hasMem}RAM: {hw.mem}{/if}{#if hasMem && hasStorage} • {/if}{#if hasStorage}Storage: {hw.storage}{/if}
								</div>
							{/if}
							{#if hw?.gpu?.count && hw.gpu.count > 0}
								<div class="text-xs text-gray-500 dark:text-slate-300">
									GPU: {hw.gpu.count}x {hw.gpu.name} • VRAM: {hw.gpu.mem}
								</div>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{calculateTotalProjects(executor)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
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
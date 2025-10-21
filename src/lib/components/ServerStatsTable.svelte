<script lang="ts">
	import type { ServerStats } from '$lib/types/serverStats';
	import { formatServerStats, getTotalProcesses, getTotalWorkflows } from '$lib/types/serverStats';

	interface Props {
		stats: ServerStats;
	}

	let { stats }: Props = $props();

	let statItems = $derived(formatServerStats(stats));
	let generalStats = $derived(statItems.filter(item => item.category === 'general'));
	let processStats = $derived(statItems.filter(item => item.category === 'processes'));
	let workflowStats = $derived(statItems.filter(item => item.category === 'workflows'));
	let totalProcesses = $derived(getTotalProcesses(stats));
	let totalWorkflows = $derived(getTotalWorkflows(stats));
</script>

<div class="space-y-6">
	<!-- Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each generalStats as stat}
			<div class="bg-white rounded-lg border border-gray-200 p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600 dark:text-slate-300">{stat.label}</p>
						<p class="text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.value.toLocaleString()}</p>
					</div>
					<div class="p-2 rounded-lg {stat.color}">
						{#if stat.label === 'Colonies'}
							<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
								<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
							</svg>
						{:else}
							<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
								<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
							</svg>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Process Statistics -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-slate-100">Process Statistics</h3>
			<span class="text-sm text-gray-500 dark:text-slate-300 dark:text-slate-300">Total: {totalProcesses.toLocaleString()}</span>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each processStats as stat}
				<div class="text-center">
					<div class="inline-flex px-3 py-1 rounded-full text-sm font-medium {stat.color} mb-2">
						{stat.value.toLocaleString()}
					</div>
					<p class="text-sm text-gray-600 dark:text-slate-300">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Workflow Statistics -->
	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-slate-100">Workflow Statistics</h3>
			<span class="text-sm text-gray-500 dark:text-slate-300 dark:text-slate-300">Total: {totalWorkflows.toLocaleString()}</span>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each workflowStats as stat}
				<div class="text-center">
					<div class="inline-flex px-3 py-1 rounded-full text-sm font-medium {stat.color} mb-2">
						{stat.value.toLocaleString()}
					</div>
					<p class="text-sm text-gray-600 dark:text-slate-300">{stat.label}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Detailed Statistics Table -->
	<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-200">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-slate-100">Detailed Statistics</h3>
		</div>
		<div class="overflow-x-auto">
			<table class="table-base">
				<thead class="table-header">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
							Category
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
							Metric
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
							Count
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider">
							Status
						</th>
					</tr>
				</thead>
				<tbody class="table-body">
					{#each statItems as stat}
						<tr class="table-row dark:hover:bg-slate-600">
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
								{stat.category}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
								{stat.label}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
								{stat.value.toLocaleString()}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {stat.color}">
									{stat.value > 0 ? 'Active' : 'None'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
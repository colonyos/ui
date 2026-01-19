<script lang="ts">
	import type { ColonyOverviewData, ExecutorNode, ProcessInfo } from '$lib/types/overview';
	import { ProcessState, getProcessStateLabel, getProcessStateColor } from '$lib/types/process';

	interface Props {
		data: ColonyOverviewData | null;
		loading?: boolean;
	}

	let { data = null, loading = false }: Props = $props();

	// Compute recent processes as a derived value to avoid mutation warnings
	let recentProcesses = $derived(
		data?.processes
			? [...data.processes]
				.sort((a, b) => {
					const timeA = a.submissionTime ? new Date(a.submissionTime).getTime() : 0;
					const timeB = b.submissionTime ? new Date(b.submissionTime).getTime() : 0;
					return timeB - timeA; // Most recent first
				})
				.slice(0, 10)
			: []
	);

	// Limit displayed executors to 5
	let displayedExecutors = $derived(
		data?.executors ? data.executors.slice(0, 5) : []
	);

	function getExecutorStateColor(state: string): string {
		switch (state) {
			case 'idle':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'busy':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'offline':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
		}
	}

	function getExecutorTypeIcon(type: string): string {
		// Simple emoji-based icons for now
		switch (type.toLowerCase()) {
			case 'cli':
				return '💻';
			case 'container':
				return '📦';
			case 'hpc':
				return '🖥️';
			case 'docker':
				return '🐳';
			default:
				return '⚙️';
		}
	}

	function formatTime(timestamp: string | undefined): string {
		if (!timestamp) return 'N/A';
		try {
			const date = new Date(timestamp);
			return date.toLocaleString();
		} catch {
			return 'Invalid date';
		}
	}
</script>

{#if !data && !loading}
	<div class="flex items-center justify-center p-12">
		<div class="text-gray-500 dark:text-gray-400">No colony data available</div>
	</div>
{:else}
	<!-- Show skeleton/structure even when loading or when we have data -->
	<!-- Colony Summary -->
	<div class="bg-white dark:bg-slate-700 rounded-lg shadow p-6 mb-6">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
			{data?.colonyName || (loading ? 'Loading...' : 'No Colony')}
		</h2>

		<!-- Executor Statistics -->
		<div class="mb-6">
			<h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Executor Status</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4">
					<div class="text-sm text-gray-600 dark:text-gray-400">Total Executors</div>
					<div class="text-3xl font-bold text-gray-900 dark:text-white">
						{#if loading && !data}—{:else}{data?.totalExecutors ?? 0}{/if}
					</div>
				</div>

				<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
					<div class="text-sm text-blue-600 dark:text-blue-400">Busy Executors</div>
					<div class="text-3xl font-bold text-blue-900 dark:text-blue-100">
						{#if loading && !data}—{:else}{data?.activeExecutors ?? 0}{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Process Statistics -->
		<div>
			<h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">Process Statistics</h3>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
				<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-3">
					<div class="text-xs text-gray-600 dark:text-gray-400">Total</div>
					<div class="text-2xl font-bold text-gray-900 dark:text-white">
						{#if loading && !data}—{:else}{data?.statistics.totalProcesses ?? 0}{/if}
					</div>
				</div>

				<div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
					<div class="text-xs text-yellow-600 dark:text-yellow-400">Waiting</div>
					<div class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
						{#if loading && !data}—{:else}{data?.statistics.waitingProcesses ?? 0}{/if}
					</div>
				</div>

				<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
					<div class="text-xs text-blue-600 dark:text-blue-400">Running</div>
					<div class="text-2xl font-bold text-blue-900 dark:text-blue-100">
						{#if loading && !data}—{:else}{data?.statistics.runningProcesses ?? 0}{/if}
					</div>
				</div>

				<div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
					<div class="text-xs text-green-600 dark:text-green-400">Success</div>
					<div class="text-2xl font-bold text-green-900 dark:text-green-100">
						{#if loading && !data}—{:else}{data?.statistics.successfulProcesses ?? 0}{/if}
					</div>
				</div>

				<div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
					<div class="text-xs text-red-600 dark:text-red-400">Failed</div>
					<div class="text-2xl font-bold text-red-900 dark:text-red-100">
						{#if loading && !data}—{:else}{data?.statistics.failedProcesses ?? 0}{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Executors List -->
	<div class="bg-white dark:bg-slate-700 rounded-lg shadow">
		<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Executors</h3>
		</div>

		<div class="divide-y divide-gray-200 dark:divide-slate-600">
			{#each (displayedExecutors || []) as executor}
				<div class="p-4 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
					<div class="flex items-start justify-between">
						<div class="flex items-start gap-3 flex-1">
							<div class="text-2xl">{getExecutorTypeIcon(executor.type)}</div>

							<div class="flex-1">
								<div class="flex items-center gap-2">
									<h4 class="font-semibold text-gray-900 dark:text-white">{executor.name}</h4>
								</div>

								<div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
									<div>{executor.type}</div>
									<div class="font-mono text-xs text-gray-500 dark:text-gray-500">{executor.id}</div>
									{#if executor.cpu}
										<div>CPU: {executor.cpu}</div>
									{/if}
									{#if executor.memory}
										<div>Memory: {executor.memory}</div>
									{/if}
									{#if executor.runningProcesses !== undefined || executor.assignedProcesses !== undefined}
										<div class="mt-1 flex gap-3">
											{#if executor.runningProcesses !== undefined}
												<span class="text-blue-600 dark:text-blue-400">
													⚡ {executor.runningProcesses} running
												</span>
											{/if}
											{#if executor.assignedProcesses !== undefined}
												<span class="text-gray-600 dark:text-gray-400">
													📋 {executor.assignedProcesses} assigned
												</span>
											{/if}
										</div>
									{/if}
								</div>

								{#if executor.capabilities && executor.capabilities.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each executor.capabilities.slice(0, 5) as capability}
											<span class="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-500 text-gray-700 dark:text-slate-200 rounded">
												{capability}
											</span>
										{/each}
										{#if executor.capabilities.length > 5}
											<span class="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
												+{executor.capabilities.length - 5} more
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}

			{#if (displayedExecutors || []).length === 0}
				<div class="p-8 text-center text-gray-500 dark:text-gray-400">
					{loading ? 'Loading executors...' : 'No executors found in this colony'}
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent Processes (always show structure) -->
	<div class="bg-white dark:bg-slate-700 rounded-lg shadow mt-6">
		<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Processes</h3>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50 dark:bg-slate-600">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							Function
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							State
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							Executor
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							Submitted
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							Process ID
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-slate-600">
					{#each (recentProcesses || []) as process}
						<tr class="hover:bg-gray-50 dark:hover:bg-slate-600">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900 dark:text-white">
									{process.functionName}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs font-medium rounded {getProcessStateColor(process.state)}">
									{getProcessStateLabel(process.state)}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900 dark:text-white">
									{process.executorName || 'Not assigned'}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-500 dark:text-gray-400">
									{formatTime(process.submissionTime)}
								</div>
							</td>
							<td class="px-6 py-4">
								<div class="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-xs">
									{process.id}
								</div>
							</td>
						</tr>
					{/each}
					{#if (recentProcesses || []).length === 0}
						<tr>
							<td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
								{loading ? 'Loading processes...' : 'No recent processes found'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
{/if}

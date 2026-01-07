<script lang="ts">
	import { onMount } from 'svelte';
	import ColonyOverview from '$lib/components/ColonyOverview.svelte';
	import type { ColonyOverviewData, ExecutorNode, ProcessInfo, ColonyStatistics } from '$lib/types/overview';
	import { ProcessState } from '$lib/types/process';
	import ClientFactory from '$lib/utils/clientFactory';

	let overviewData: ColonyOverviewData | null = $state(null);
	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let loadingError = $state('');

	async function loadColonyData() {
		loadingStatus = 'loading';
		loadingError = '';

		try {
			const serverClient = await ClientFactory.getServerClient();
			const colonyClient = await ClientFactory.getColonyClient();

			// Get data using different keys for different operations
			let colonies: any[] = [];
			let executors: any[] = [];
			let processes: any[] = [];
			let statistics: any = null;

			// Get colonies
			try {
				colonies = await serverClient.getColonies();
			} catch (e) {
				console.warn('Failed to get server data:', e);
			}

			// Get executors, processes, and statistics
			if (colonies.length > 0) {
				const colonyName = colonies[0]?.name;
				if (colonyName) {
					// Fetch all data in parallel using Promise.allSettled for independent error handling
					const [
						statisticsResult,
						executorsResult,
						runningProcessesResult,
						queuedProcessesResult,
						successfulProcessesResult,
						failedProcessesResult
					] = await Promise.allSettled([
						colonyClient.getStatistics(colonyName),
						colonyClient.getExecutors(colonyName, 5),
						colonyClient.getProcesses(colonyName, 3, 1), // Running
						colonyClient.getProcesses(colonyName, 3, 0), // Waiting
						colonyClient.getProcesses(colonyName, 3, 2), // Successful
						colonyClient.getProcesses(colonyName, 3, 3)  // Failed
					]);

					// Extract results, handling failures gracefully
					statistics = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
					executors = executorsResult.status === 'fulfilled' ? executorsResult.value : [];

					const runningProcesses = runningProcessesResult.status === 'fulfilled' ? runningProcessesResult.value : [];
					const queuedProcesses = queuedProcessesResult.status === 'fulfilled' ? queuedProcessesResult.value : [];
					const successfulProcesses = successfulProcessesResult.status === 'fulfilled' ? successfulProcessesResult.value : [];
					const failedProcesses = failedProcessesResult.status === 'fulfilled' ? failedProcessesResult.value : [];

					// Log any failures for debugging
					if (statisticsResult.status === 'rejected') console.warn('Failed to get statistics:', statisticsResult.reason);
					if (executorsResult.status === 'rejected') console.warn('Failed to get executors:', executorsResult.reason);
					if (runningProcessesResult.status === 'rejected') console.warn('Failed to get running processes:', runningProcessesResult.reason);
					if (queuedProcessesResult.status === 'rejected') console.warn('Failed to get queued processes:', queuedProcessesResult.reason);
					if (successfulProcessesResult.status === 'rejected') console.warn('Failed to get successful processes:', successfulProcessesResult.reason);
					if (failedProcessesResult.status === 'rejected') console.warn('Failed to get failed processes:', failedProcessesResult.reason);

					processes = [
						...(Array.isArray(runningProcesses) ? runningProcesses : []),
						...(Array.isArray(queuedProcesses) ? queuedProcesses : []),
						...(Array.isArray(successfulProcesses) ? successfulProcesses : []),
						...(Array.isArray(failedProcesses) ? failedProcesses : [])
					];
				}
			}

			// Prepare detailed overview data
			if (colonies.length > 0 && executors.length > 0) {
				const colonyName = colonies[0]?.name || 'Unknown Colony';


				// Transform processes
				const processInfos: ProcessInfo[] = processes.map((proc: any) => {
					// Look up executor name from executors list using assignedexecutorid
					// Only if the process is actually assigned
					let executorName = undefined;
					if (proc.isassigned && proc.assignedexecutorid) {
						// Try to find executor by ID - check both exact match and trimmed/normalized versions
						const assignedId = proc.assignedexecutorid?.trim();
						const executor = executors.find((e: any) => {
							const execId = e.executorid?.trim();
							return execId === assignedId;
						});

						if (executor) {
							// Executor found - use its name
							executorName = executor.executorname || executor.name || undefined;
						} else {
							// Executor not found (no longer active) - show truncated ID
							executorName = `${assignedId.substring(0, 12)}...`;
						}
					}

					return {
						id: proc.processid || '',
						functionName: proc.spec?.funcname || proc.spec?.functionname || 'Unknown',
						state: proc.state ?? -1,
						executorId: proc.assignedexecutorid || undefined,
						executorName: executorName,
						submissionTime: proc.submissiontime,
						startTime: proc.starttime,
						endTime: proc.endtime
					};
				});

				// Use statistics from server, with fallback to manual calculation
				const colonyStats: ColonyStatistics = statistics ? {
					totalProcesses: (statistics.waitingprocesses || 0) + (statistics.runningprocesses || 0) + (statistics.successfulprocesses || 0) + (statistics.failedprocesses || 0),
					waitingProcesses: statistics.waitingprocesses || 0,
					runningProcesses: statistics.runningprocesses || 0,
					successfulProcesses: statistics.successfulprocesses || 0,
					failedProcesses: statistics.failedprocesses || 0
				} : {
					totalProcesses: processInfos.length,
					waitingProcesses: processInfos.filter(p => p.state === ProcessState.WAITING).length,
					runningProcesses: processInfos.filter(p => p.state === ProcessState.RUNNING).length,
					successfulProcesses: processInfos.filter(p => p.state === ProcessState.SUCCESS).length,
					failedProcesses: processInfos.filter(p => p.state === ProcessState.FAILED).length
				};

				// Count processes per executor
				const executorProcessCounts = new Map<string, { running: number; assigned: number }>();
				processInfos.forEach(proc => {
					if (proc.executorId) {
						const current = executorProcessCounts.get(proc.executorId) || { running: 0, assigned: 0 };
						current.assigned++;
						if (proc.state === ProcessState.RUNNING) {
							current.running++;
						}
						executorProcessCounts.set(proc.executorId, current);
					}
				});

				// Transform executors - filter out unregistered executors (state=3)
				const registeredExecutors = executors.filter((exec: any) => exec.state !== 3);
				const executorNodes: ExecutorNode[] = registeredExecutors.map((exec: any) => {
					const execId = exec.executorid || exec.id || '';
					const processCounts = executorProcessCounts.get(execId) || { running: 0, assigned: 0 };

					let state: 'idle' | 'busy' | 'offline' = 'idle';
					if (processCounts.running > 0) {
						state = 'busy';
					} else if (exec.state) {
						state = exec.state;
					}

					return {
						id: execId,
						name: exec.executorname || exec.name || 'Unknown',
						type: exec.executortype || exec.type || 'unknown',
						state: state,
						colonyName: exec.colonyname || colonyName,
						lastSeen: exec.lastheardtime || exec.lastSeen,
						cpu: exec.cpu,
						memory: exec.mem || exec.memory,
						capabilities: exec.capabilities || [],
						assignedProcesses: processCounts.assigned,
						runningProcesses: processCounts.running
					};
				});

				const activeExecutors = executorNodes.filter(e => e.state === 'busy').length;

				overviewData = {
					colonyName: colonyName,
					executors: executorNodes,
					processes: processInfos,
					statistics: colonyStats,
					totalExecutors: executorNodes.length,
					activeExecutors: activeExecutors
				};
			}

			loadingStatus = 'success';
		} catch (e) {
			console.error('Failed to load colony data:', e);
			loadingError = e instanceof Error ? e.message : 'Failed to load colony data';
			loadingStatus = 'error';
		}
	}

	onMount(() => {
		loadColonyData();
	});
</script>

<svelte:head>
	<title>Colony Overview - Colony Dashboard</title>
</svelte:head>

<div>
	<h1 class="page-title">Colony Overview</h1>
</div>

{#if loadingStatus === 'error'}
	<div class="mb-4 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300 px-4 py-3 rounded">
		<strong>Error:</strong> {loadingError}
	</div>
{/if}

<div class="flex justify-end items-center mb-4">
	<button
		onclick={loadColonyData}
		disabled={loadingStatus === 'loading'}
		class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
		title="Refresh"
		aria-label="Refresh"
	>
		{#if loadingStatus === 'loading'}
			<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		{:else}
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
			</svg>
		{/if}
	</button>
</div>

<ColonyOverview data={overviewData} loading={loadingStatus === 'loading'} />

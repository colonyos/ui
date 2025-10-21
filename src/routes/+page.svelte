<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient, ColonyEndpoint, PROCESS_STATE_NOTSET } from '$lib/api/colony';
	import ColonyOverview from '$lib/components/ColonyOverview.svelte';
	import type { ColonyOverviewData, ExecutorNode, ProcessInfo, ColonyStatistics } from '$lib/types/overview';
	import { ProcessState } from '$lib/types/process';
	import Crypto from '$lib/crypto/crypto.js';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let overviewData = $state<ColonyOverviewData | null>(null);
	let autoRefresh = $state(true);
	let refreshInterval = $state(5000); // 5 seconds
	let intervalId: ReturnType<typeof setInterval> | null = null;

	async function loadColonyOverview() {
		loading = true;
		error = null;

		try {
			// Initialize crypto
			const crypto = new Crypto();
			await crypto.load();

			// Create API client
			const endpoint = new ColonyEndpoint(envConfig.host, envConfig.port);
			const client = new ColonyClient(endpoint, crypto, envConfig.tls);

			// Use colony private key for getting executors and processes
			client.setPrivateKey(envConfig.colonyPrvKey, 'colony');

			// Fetch executors for the colony
			const executorsResponse = await client.getExecutors(envConfig.colonyName);

			// Fetch recent processes (all states, limited to 100)
			const processesResponse = await client.getProcesses(envConfig.colonyName, 100, PROCESS_STATE_NOTSET);

			// Transform processes to our data structure
			const processes: ProcessInfo[] = processesResponse.map((proc: any) => ({
				id: proc.processid || '',
				functionName: proc.spec?.funcname || proc.spec?.functionname || 'Unknown',
				state: proc.state ?? -1,
				executorId: proc.assignedexecutorid || undefined,
				executorName: proc.assignedexecutorname || undefined,
				submissionTime: proc.submissiontime,
				startTime: proc.starttime,
				endTime: proc.endtime
			}));

			// Calculate statistics
			const statistics: ColonyStatistics = {
				totalProcesses: processes.length,
				waitingProcesses: processes.filter(p => p.state === ProcessState.WAITING).length,
				runningProcesses: processes.filter(p => p.state === ProcessState.RUNNING).length,
				successfulProcesses: processes.filter(p => p.state === ProcessState.SUCCESS).length,
				failedProcesses: processes.filter(p => p.state === ProcessState.FAILED).length
			};

			// Count processes assigned to each executor
			const executorProcessCounts = new Map<string, { running: number; assigned: number }>();
			processes.forEach(proc => {
				if (proc.executorId) {
					const current = executorProcessCounts.get(proc.executorId) || { running: 0, assigned: 0 };
					current.assigned++;
					if (proc.state === ProcessState.RUNNING) {
						current.running++;
					}
					executorProcessCounts.set(proc.executorId, current);
				}
			});

			// Transform API response to our data structure
			const executors: ExecutorNode[] = executorsResponse.map((exec: any) => {
				const execId = exec.executorid || exec.id || '';
				const processCounts = executorProcessCounts.get(execId) || { running: 0, assigned: 0 };

				// Determine state based on running processes
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
					colonyName: exec.colonyname || envConfig.colonyName,
					lastSeen: exec.lastheardtime || exec.lastSeen,
					cpu: exec.cpu,
					memory: exec.mem || exec.memory,
					capabilities: exec.capabilities || [],
					assignedProcesses: processCounts.assigned,
					runningProcesses: processCounts.running
				};
			});

			// Calculate summary statistics
			const activeExecutors = executors.filter(e => e.state === 'busy').length;
			const idleExecutors = executors.filter(e => e.state === 'idle').length;

			overviewData = {
				colonyName: envConfig.colonyName,
				executors: executors,
				processes: processes,
				statistics: statistics,
				totalExecutors: executors.length,
				activeExecutors: activeExecutors,
				idleExecutors: idleExecutors
			};

		} catch (err) {
			console.error('Failed to load colony overview:', err);
			error = err instanceof Error ? err.message : 'Failed to load colony overview';
		} finally {
			loading = false;
		}
	}

	function startAutoRefresh() {
		if (intervalId) {
			clearInterval(intervalId);
		}
		if (autoRefresh) {
			intervalId = setInterval(() => {
				loadColonyOverview();
			}, refreshInterval);
		}
	}

	function stopAutoRefresh() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	onMount(() => {
		loadColonyOverview();
		if (autoRefresh) {
			startAutoRefresh();
		}
	});

	onDestroy(() => {
		stopAutoRefresh();
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between flex-wrap gap-4">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Colony Overview</h1>

		<div class="flex items-center gap-3">
			<!-- Auto-refresh toggle -->
			<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
				<input
					type="checkbox"
					checked={autoRefresh}
					onchange={toggleAutoRefresh}
					class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<span>Auto-refresh ({refreshInterval / 1000}s)</span>
			</label>

			<!-- Refresh interval selector -->
			<select
				bind:value={refreshInterval}
				onchange={startAutoRefresh}
				class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
				disabled={!autoRefresh}
			>
				<option value={2000}>2s</option>
				<option value={5000}>5s</option>
				<option value={10000}>10s</option>
				<option value={30000}>30s</option>
				<option value={60000}>60s</option>
			</select>

			<!-- Manual refresh button -->
			<button
				onclick={loadColonyOverview}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
				disabled={loading}
				title="Refresh"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<div class="flex items-start gap-3">
				<div class="text-red-600 dark:text-red-400 text-xl">⚠️</div>
				<div>
					<h3 class="font-semibold text-red-900 dark:text-red-100">Error Loading Colony Overview</h3>
					<p class="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<ColonyOverview data={overviewData} {loading} />
</div>

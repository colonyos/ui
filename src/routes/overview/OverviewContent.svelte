<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import SvelteFlowColonyDiagram from '$lib/components/SvelteFlowColonyDiagram.svelte';
	import ColonyOverview from '$lib/components/ColonyOverview.svelte';
	import type { ColonyGraphData, GraphNode, ColonyServer, ColonyExecutor } from '$lib/types/colony-graph';
	import type { ColonyOverviewData, ExecutorNode, ProcessInfo, ColonyStatistics } from '$lib/types/overview';
	import { transformColonyAPIToGraphData, createSampleColonyData } from '$lib/utils/colony-data-transformer';
	import { PROCESS_STATE_NOTSET } from '$lib/api/colony';
	import { ProcessState } from '$lib/types/process';
	import ClientFactory from '$lib/utils/clientFactory';

	let graphData: ColonyGraphData = $state(createSampleColonyData());
	let overviewData: ColonyOverviewData | null = $state(null);
	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let loadingError = $state('');
	let selectedNode: GraphNode | null = $state(null);
	let executorFunctions: any[] = $state([]);
	let loadingFunctions = $state(false);

	// Display options - determine from URL
	let activeView: 'diagram' | 'details' = $derived($page.url.pathname === '/overview/visual' ? 'diagram' : 'details');

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

			// Get colonies
			try {
				colonies = await serverClient.getColonies();
			} catch (e) {
				console.warn('Failed to get server data:', e);
			}

			// Get executors and processes
			if (colonies.length > 0) {
				try {
					// Get executors for the first colony
					const colonyName = colonies[0]?.name;
					if (colonyName) {
						executors = await colonyClient.getExecutors(colonyName);

						// Get processes with different states
						const runningProcesses = await colonyClient.getProcesses(colonyName, 50, 1); // Running
						const queuedProcesses = await colonyClient.getProcesses(colonyName, 50, 0); // Waiting
						const successfulProcesses = await colonyClient.getProcesses(colonyName, 50, 2); // Successful
						const failedProcesses = await colonyClient.getProcesses(colonyName, 50, 3); // Failed

						processes = [
							...(Array.isArray(runningProcesses) ? runningProcesses : []),
							...(Array.isArray(queuedProcesses) ? queuedProcesses : []),
							...(Array.isArray(successfulProcesses) ? successfulProcesses : []),
							...(Array.isArray(failedProcesses) ? failedProcesses : [])
						];
					}
				} catch (e) {
					console.warn('Failed to get colony data:', e);
				}
			}

			// Transform API data to graph format
			const apiData = { colonies, executors, processes };
			const transformedData = transformColonyAPIToGraphData(apiData);

			// Use sample data if no real data is available
			if (transformedData.servers.length === 0 && transformedData.executors.length === 0) {
				console.log('No API data available, using sample data');
				graphData = createSampleColonyData();
			} else {
				graphData = transformedData;
			}

			// Also prepare detailed overview data
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

				// Calculate statistics
				const statistics: ColonyStatistics = {
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
				const idleExecutors = executorNodes.filter(e => e.state === 'idle').length;

				overviewData = {
					colonyName: colonyName,
					executors: executorNodes,
					processes: processInfos,
					statistics: statistics,
					totalExecutors: executorNodes.length,
					activeExecutors: activeExecutors,
					idleExecutors: idleExecutors
				};
			}

			loadingStatus = 'success';
		} catch (e) {
			console.error('Failed to load colony data:', e);
			loadingError = e instanceof Error ? e.message : 'Failed to load colony data';
			loadingStatus = 'error';
			// Fall back to sample data on error
			graphData = createSampleColonyData();
		}
	}

	async function handleNodeClick(node: GraphNode) {
		selectedNode = node;

		// If it's an executor, fetch its functions
		if (node.type === 'executor') {
			loadingFunctions = true;
			executorFunctions = [];

			try {
				const colonyClient = await ClientFactory.getColonyClient();
				const executor = node.data as ColonyExecutor;

				// Get the colony name - the serverId IS the colony name
				const colonyName = executor.serverId;

				// Fetch functions for this executor
				const functions = await colonyClient.getFunctionsForExecutor(colonyName, executor.name);
				executorFunctions = Array.isArray(functions) ? functions : [];
			} catch (error) {
				console.error('Failed to load executor functions:', error);
				executorFunctions = [];
			} finally {
				loadingFunctions = false;
			}
		}
	}

	function closeNodeDetails() {
		selectedNode = null;
		executorFunctions = [];
		loadingFunctions = false;
	}

	onMount(() => {
		loadColonyData();
	});
</script>

<svelte:head>
	<title>Colony Overview - Colony Dashboard</title>
</svelte:head>

<div class="colony-overview">
	<div class="page-header">
		<h1 class="page-title">Colony Overview</h1>
	</div>

	<div class="header">
		<div class="controls">
			<div class="control-group">
				<button
					onclick={loadColonyData}
					disabled={loadingStatus === 'loading'}
					class="btn btn-primary"
				>
					{#if loadingStatus === 'loading'}
						<svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Loading...
					{:else}
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
						</svg>
						Refresh
					{/if}
				</button>
			</div>

		</div>
	</div>

	<!-- View Tabs -->
	<div class="view-tabs">
		<button
			onclick={() => goto('/overview')}
			class="tab {activeView === 'details' ? 'active' : ''}"
		>
			📊 Details & Statistics
		</button>
		<button
			onclick={() => goto('/overview/visual')}
			class="tab {activeView === 'diagram' ? 'active' : ''}"
		>
			🗺️ Visual Diagram
		</button>
	</div>

	{#if loadingStatus === 'error'}
		<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
			<strong>Error:</strong> {loadingError}
			<div class="text-sm mt-1">Showing sample data instead.</div>
		</div>
	{/if}

	<!-- Details View -->
	{#if activeView === 'details'}
		<div class="details-container">
			<ColonyOverview data={overviewData} loading={loadingStatus === 'loading'} />
		</div>
	{/if}

	<!-- Diagram View -->
	{#if activeView === 'diagram'}
	<div class="graph-container">
		<div class="stats-bar">
			<div class="stat">
				<span class="stat-label">Servers:</span>
				<span class="stat-value">{graphData.servers.length}</span>
				<span class="stat-detail">({graphData.servers.filter(s => s.status === 'online').length} online)</span>
			</div>
			<div class="stat">
				<span class="stat-label">Executors:</span>
				<span class="stat-value">{graphData.executors.length}</span>
				<span class="stat-detail">({graphData.executors.filter(e => e.status === 'busy').length} busy)</span>
			</div>
			<div class="stat">
				<span class="stat-label">Active Jobs:</span>
				<span class="stat-value">{graphData.activeJobs.filter(j => j.status === 'running').length}</span>
				<span class="stat-detail">({graphData.activeJobs.filter(j => j.status === 'queued').length} queued)</span>
			</div>
		</div>

		<div class="diagram-wrapper">
			<SvelteFlowColonyDiagram
				data={graphData}
				onNodeClick={handleNodeClick}
			/>
		</div>

		<div class="legend">
			<h3>Legend</h3>
			<div class="legend-items">
				<div class="legend-item">
					<div class="legend-icon server online"></div>
					<span>Server (Online)</span>
				</div>
				<div class="legend-item">
					<div class="legend-icon server offline"></div>
					<span>Server (Offline)</span>
				</div>
				<div class="legend-item">
					<div class="legend-icon executor online"></div>
					<span>Executor (Idle)</span>
				</div>
				<div class="legend-item">
					<div class="legend-icon executor busy"></div>
					<span>Executor (Busy)</span>
				</div>
				<div class="legend-item">
					<div class="legend-icon executor offline"></div>
					<span>Executor (Offline)</span>
				</div>
			</div>
		</div>
	</div>

	{#if selectedNode && activeView === 'diagram'}
		<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1" onclick={closeNodeDetails} onkeydown={(e) => e.key === 'Escape' && closeNodeDetails()}>
			<div class="modal" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>{selectedNode.type === 'server' ? 'Server Details' : 'Executor Details'}</h3>
					<button onclick={closeNodeDetails} aria-label="Close" class="modal-close">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
				<div class="modal-content">
					{#if selectedNode.type === 'server'}
						{@const server = selectedNode.data as ColonyServer}
						<div class="detail-grid">
							<div class="detail-item">
								<span class="detail-label">Name:</span>
								<span class="detail-value">{server.name}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Host:</span>
								<span class="detail-value">{server.host}:{server.port}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Status:</span>
								<span class="detail-value status-{server.status}">{server.status}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Active Processes:</span>
								<span class="detail-value">{server.processCount || 0}</span>
							</div>
							{#if server.lastSeen}
								<div class="detail-item">
									<span class="detail-label">Last Seen:</span>
									<span class="detail-value">{server.lastSeen.toLocaleString()}</span>
								</div>
							{/if}
						</div>
					{:else}
						{@const executor = selectedNode.data as ColonyExecutor}
						<div class="detail-grid">
							<div class="detail-item">
								<span class="detail-label">Name:</span>
								<span class="detail-value">{executor.name}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Status:</span>
								<span class="detail-value status-{executor.status}">{executor.status}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Available Functions:</span>
								{#if loadingFunctions}
									<div class="loading-spinner">
										<svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										<span>Loading functions...</span>
									</div>
								{:else if executorFunctions.length > 0}
									<div class="functions-list">
										{#each executorFunctions as func}
											<div class="function-item">
												<span class="function-name">{func.funcname || func.functionname || 'Unknown'}</span>
												{#if func.executortype}
													<span class="function-type">{func.executortype}</span>
												{/if}
											</div>
										{/each}
									</div>
								{:else}
									<span class="detail-value">No functions available</span>
								{/if}
							</div>
							<div class="detail-item">
								<span class="detail-label">Process Count:</span>
								<span class="detail-value">{executor.processCount || 0}</span>
							</div>
							{#if executor.currentProcess}
								<div class="detail-item">
									<span class="detail-label">Current Process:</span>
									<span class="detail-value">{executor.currentProcess}</span>
								</div>
							{/if}
							{#if executor.lastActivity}
								<div class="detail-item">
									<span class="detail-label">Last Activity:</span>
									<span class="detail-value">{executor.lastActivity.toLocaleString()}</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	{/if}
</div>

<style>
	.colony-overview {
		padding: 2rem;
		min-height: 100vh;
		background: #f9fafb;
	}

	:global(.dark) .colony-overview {
		background: #1e293b;
	}

	.view-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 2px solid #e5e7eb;
	}

	:global(.dark) .view-tabs {
		border-bottom-color: #475569;
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
		margin-bottom: -2px;
	}

	:global(.dark) .tab {
		color: #94a3b8;
	}

	.tab:hover {
		color: #374151;
		background: #f3f4f6;
	}

	:global(.dark) .tab:hover {
		color: #cbd5e1;
		background: #334155;
	}

	.tab.active {
		color: #3b82f6;
		border-bottom-color: #3b82f6;
		background: white;
	}

	:global(.dark) .tab.active {
		color: #60a5fa;
		background: #475569;
	}

	.details-container {
		margin-top: 1rem;
	}

	.header {
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		gap: 0.5rem;
	}

	.view-options {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-success {
		background: #10b981;
		color: white;
	}

	.btn-success:hover {
		background: #059669;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #dc2626;
		margin-bottom: 1rem;
	}

	.graph-container {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	:global(.dark) .graph-container {
		background: #334155;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.stats-bar {
		display: flex;
		gap: 2rem;
		padding: 1rem 2rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	:global(.dark) .stats-bar {
		background: #475569;
		border-bottom-color: #64748b;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.stat-label {
		color: #6b7280;
		font-weight: 500;
	}

	:global(.dark) .stat-label {
		color: #cbd5e1;
	}

	.stat-value {
		color: #111827;
		font-weight: 700;
		font-size: 1.125rem;
	}

	:global(.dark) .stat-value {
		color: #f1f5f9;
	}

	.stat-detail {
		color: #6b7280;
		font-size: 0.75rem;
	}

	:global(.dark) .stat-detail {
		color: #94a3b8;
	}

	.diagram-wrapper {
		padding: 0;
	}

	.legend {
		padding: 1rem 2rem;
		background: #f8fafc;
		border-top: 1px solid #e2e8f0;
	}

	:global(.dark) .legend {
		background: #475569;
		border-top-color: #64748b;
	}

	.legend h3 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	:global(.dark) .legend h3 {
		color: #f1f5f9;
	}

	.legend-items {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	:global(.dark) .legend-item {
		color: #cbd5e1;
	}

	.legend-icon {
		width: 16px;
		height: 12px;
		border: 1px solid #fff;
	}

	.legend-icon.server {
		border-radius: 4px;
		width: 20px;
		height: 12px;
	}

	.legend-icon.executor {
		width: 12px;
		height: 12px;
		transform: rotate(45deg);
		border-radius: 0;
	}

	.legend-icon.server.online {
		background: #10b981;
	}

	.legend-icon.server.offline {
		background: #ef4444;
	}

	.legend-icon.executor.online {
		background: #10b981;
	}

	.legend-icon.executor.busy {
		background: #f59e0b;
	}

	.legend-icon.executor.offline {
		background: #6b7280;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		max-width: 500px;
		width: 90%;
		max-height: 80vh;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
	}

	.modal-close:hover {
		color: #374151;
		background: #f3f4f6;
	}

	.modal-content {
		padding: 1.5rem;
		overflow-y: auto;
	}

	.detail-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #111827;
	}

	.detail-value.status-online {
		color: #10b981;
		font-weight: 500;
	}

	.detail-value.status-offline {
		color: #ef4444;
		font-weight: 500;
	}

	.detail-value.status-busy {
		color: #f59e0b;
		font-weight: 500;
	}

	.capabilities {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.capability-tag {
		padding: 0.25rem 0.5rem;
		background: #e0e7ff;
		color: #3730a3;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.loading-spinner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.functions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.function-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background: #f3f4f6;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	:global(.dark) .function-item {
		background: #374151;
	}

	.function-name {
		font-weight: 500;
		color: #111827;
	}

	:global(.dark) .function-name {
		color: #f9fafb;
	}

	.function-type {
		font-size: 0.75rem;
		color: #6b7280;
		padding: 0.125rem 0.375rem;
		background: #e5e7eb;
		border-radius: 0.25rem;
	}

	:global(.dark) .function-type {
		background: #4b5563;
		color: #9ca3af;
	}

	@media (max-width: 1024px) {
		.colony-overview {
			padding: 1rem;
		}

		.graph-wrapper {
			padding: 1rem;
		}

		.stats-bar {
			flex-direction: column;
			gap: 1rem;
		}

		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.controls {
			justify-content: space-between;
		}
	}
</style>
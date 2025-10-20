<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import StaticColonyDiagram from '$lib/components/StaticColonyDiagram.svelte';
	import type { ColonyGraphData, GraphNode, ColonyServer, ColonyExecutor } from '$lib/types/colony-graph';
	import { transformColonyAPIToGraphData, createSampleColonyData } from '$lib/utils/colony-data-transformer';
	import { ColonyClient, ColonyEndpoint } from '$lib/api/colony';
	import { appState } from '$lib/stores/appState';
	import Crypto from '$lib/crypto/crypto.js';

	let graphData: ColonyGraphData = $state(createSampleColonyData());
	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let loadingError = $state('');
	let selectedNode: GraphNode | null = $state(null);
	let refreshInterval: number | null = null;

	// Display options
	let autoRefresh = $state(false);

	async function loadColonyData() {
		loadingStatus = 'loading';
		loadingError = '';

		try {
			const crypto = new Crypto();
			await crypto.load();

			const endpoint = new ColonyEndpoint($appState.host || 'localhost', $appState.port || '50080');
			const client = new ColonyClient(endpoint, crypto, $appState.tls === 'true');

			// Get data using different keys for different operations
			let colonies: any[] = [];
			let executors: any[] = [];
			let processes: any[] = [];
			let serverStatus: any = null;

			// Use server key for getting colonies and server status
			if ($appState.serverPrvKey) {
				client.setPrivateKey($appState.serverPrvKey, 'server');
				try {
					colonies = await client.getColonies();
					serverStatus = await client.getServerStatus();
				} catch (e) {
					console.warn('Failed to get server data:', e);
				}
			}

			// Use colony key for getting executors and processes
			if ($appState.colonyPrvKey && colonies.length > 0) {
				client.setPrivateKey($appState.colonyPrvKey, 'colony');
				try {
					// Get executors for the first colony
					const colonyName = colonies[0]?.name;
					if (colonyName) {
						executors = await client.getExecutors(colonyName);

						// Get processes with different states
						const runningProcesses = await client.getProcesses(colonyName, 50, 1); // Running
						const queuedProcesses = await client.getProcesses(colonyName, 50, 0); // Waiting

						processes = [
							...(Array.isArray(runningProcesses) ? runningProcesses : []),
							...(Array.isArray(queuedProcesses) ? queuedProcesses : [])
						];
					}
				} catch (e) {
					console.warn('Failed to get colony data:', e);
				}
			}

			// Transform API data to graph format
			const apiData = { colonies, executors, processes, serverStatus };
			const transformedData = transformColonyAPIToGraphData(apiData);

			// Use sample data if no real data is available
			if (transformedData.servers.length === 0 && transformedData.executors.length === 0) {
				console.log('No API data available, using sample data');
				graphData = createSampleColonyData();
			} else {
				graphData = transformedData;
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

	function handleNodeClick(node: GraphNode) {
		selectedNode = node;
	}

	function closeNodeDetails() {
		selectedNode = null;
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	function startAutoRefresh() {
		if (refreshInterval) return;
		refreshInterval = setInterval(() => {
			loadColonyData();
		}, 10000); // Refresh every 10 seconds
	}

	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	onMount(() => {
		loadColonyData();
		if (autoRefresh) {
			startAutoRefresh();
		}
	});

	onDestroy(() => {
		stopAutoRefresh();
	});
</script>

<svelte:head>
	<title>Colony Overview - Colony Dashboard</title>
</svelte:head>

<div class="colony-overview">
	<div class="header">
		<div class="header-content">
			<h1 class="text-3xl font-bold text-gray-900">Colony Overview</h1>
			<p class="text-gray-600 mt-2">
				Visual representation of your Colony infrastructure showing servers, executors, and job flow.
			</p>
		</div>

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

				<button
					onclick={toggleAutoRefresh}
					class="btn {autoRefresh ? 'btn-success' : 'btn-secondary'}"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
				</button>
			</div>

		</div>
	</div>

	{#if loadingStatus === 'error'}
		<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
			<strong>Error:</strong> {loadingError}
			<div class="text-sm mt-1">Showing sample data instead.</div>
		</div>
	{/if}

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
			<StaticColonyDiagram
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

	{#if selectedNode}
		<div class="modal-overlay" onclick={closeNodeDetails}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>{selectedNode.type === 'server' ? 'Server Details' : 'Executor Details'}</h3>
					<button onclick={closeNodeDetails} class="modal-close">
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
								<span class="detail-label">Capabilities:</span>
								<div class="capabilities">
									{#each executor.capabilities as capability}
										<span class="capability-tag">{capability}</span>
									{/each}
								</div>
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
</div>

<style>
	.colony-overview {
		padding: 2rem;
		min-height: 100vh;
		background: #f9fafb;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-content h1 {
		color: #111827;
		font-size: 1.875rem;
		font-weight: 700;
		margin: 0;
	}

	.header-content p {
		color: #6b7280;
		margin: 0.5rem 0 0 0;
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

	.checkbox-label input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
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

	.error-banner small {
		margin-left: auto;
		font-size: 0.75rem;
	}

	.graph-container {
		background: white;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.stats-bar {
		display: flex;
		gap: 2rem;
		padding: 1rem 2rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
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

	.stat-value {
		color: #111827;
		font-weight: 700;
		font-size: 1.125rem;
	}

	.stat-detail {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.diagram-wrapper {
		padding: 0;
	}

	.legend {
		padding: 1rem 2rem;
		background: #f8fafc;
		border-top: 1px solid #e2e8f0;
	}

	.legend h3 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
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
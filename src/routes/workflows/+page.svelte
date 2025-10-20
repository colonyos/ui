<script lang="ts">
	import { onMount } from 'svelte';
	import WorkflowDAG from '$lib/components/WorkflowDAG.svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import Crypto from '$lib/crypto/crypto.js';

	interface ProcessGraph {
		processgraphid: string;
		initiatorname: string;
		colonyname: string;
		state: number;
		submissiontime: string;
		starttime: string;
		endtime: string;
		processids?: string[];
		rootprocessids?: string[];
	}

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let loadingError = '';
	let workflows: ProcessGraph[] = [];
	let selectedWorkflow: ProcessGraph | null = null;
	let graphData: any = null;
	let graphLoadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let graphLoadingError = '';
	let crypto: Crypto;
	let colonyClient: ColonyClient | null = null;
	let colonyName = '';

	onMount(async () => {
		crypto = new Crypto();
		await crypto.load();

		const host = $appState.host || envConfig.host;
		const port = $appState.port || envConfig.port;
		const tls = ($appState.tls || envConfig.tls) === 'true';
		colonyName = $appState.colonyName || envConfig.colonyName || '';

		if (host && port) {
			const endpoint = { host, port };

			colonyClient = new ColonyClient(endpoint, crypto, tls);
			const colonyPrivateKey = $appState.colonyPrvKey || envConfig.colonyPrvKey;
			if (colonyPrivateKey) {
				colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
			}

			await loadWorkflows();
		}
	});

	async function loadWorkflows() {
		if (!colonyClient) {
			loadingError = 'Colony client not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		if (!colonyName) {
			loadingError = 'Colony name not configured.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		workflows = [];

		try {
			console.log('=== Fetching workflows list ===');
			console.log('Colony:', colonyName);

			const response = await colonyClient.getProcessGraphs(colonyName);
			console.log('=== getProcessGraphs Response ===');
			console.log('Full response:', JSON.stringify(response, null, 2));

			if (response && response.processgraphs && Array.isArray(response.processgraphs)) {
				workflows = response.processgraphs;
				console.log(`Found ${workflows.length} workflows`);
				loadingStatus = 'success';
			} else if (response && Array.isArray(response)) {
				// Handle case where response is directly an array
				workflows = response;
				console.log(`Found ${workflows.length} workflows`);
				loadingStatus = 'success';
			} else {
				loadingError = 'Invalid response format from server';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load workflows:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	async function selectWorkflow(workflow: ProcessGraph) {
		if (!colonyClient) {
			graphLoadingError = 'Colony client not initialized.';
			graphLoadingStatus = 'error';
			return;
		}

		selectedWorkflow = workflow;
		graphLoadingStatus = 'loading';
		graphLoadingError = '';
		graphData = null;

		try {
			console.log('=== Fetching workflow graph data ===');
			console.log('Workflow ID:', workflow.processgraphid);

			graphData = await colonyClient.getProcessGraph(workflow.processgraphid);
			console.log('=== getProcessGraph Response ===');
			console.log('Full response:', JSON.stringify(graphData, null, 2));

			if (graphData && graphData.nodes && graphData.edges) {
				console.log('Graph structure loaded:', {
					nodes: graphData.nodes.length,
					edges: graphData.edges.length
				});
				graphLoadingStatus = 'success';
			} else {
				graphLoadingError = 'Invalid workflow graph data received from server';
				graphLoadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load workflow graph:', error);
			graphLoadingError = error instanceof Error ? error.message : String(error);
			graphLoadingStatus = 'error';
		}
	}

	function backToList() {
		selectedWorkflow = null;
		graphData = null;
		graphLoadingStatus = 'idle';
	}

	function getWorkflowStateLabel(state: number): string {
		switch (state) {
			case 0: return 'Waiting';
			case 1: return 'Running';
			case 2: return 'Successful';
			case 3: return 'Failed';
			default: return 'Unknown';
		}
	}

	function getWorkflowStateColor(state: number): string {
		switch (state) {
			case 0: return 'bg-yellow-100 text-yellow-800';
			case 1: return 'bg-blue-100 text-blue-800';
			case 2: return 'bg-green-100 text-green-800';
			case 3: return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	function formatTime(timeString: string): string {
		if (!timeString || timeString === '0001-01-01T00:00:00Z' || timeString === '0001-01-01T00:53:28+00:53') {
			return '-';
		}
		try {
			return new Date(timeString).toLocaleString();
		} catch {
			return 'Invalid time';
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Workflows</h1>
		<p class="mt-2 text-gray-600">
			{selectedWorkflow ? 'Workflow DAG visualization' : 'Manage and visualize workflow process graphs'}
		</p>
	</div>

	{#if !selectedWorkflow}
		<!-- Workflows List View -->
		<div class="bg-white rounded-lg border border-gray-200">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex justify-between items-center">
					<h2 class="text-lg font-semibold text-gray-900">Process Graphs</h2>
					<button
						on:click={loadWorkflows}
						disabled={loadingStatus === 'loading'}
						class="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded transition-colors"
					>
						{loadingStatus === 'loading' ? 'Loading...' : 'Refresh'}
					</button>
				</div>
			</div>

			{#if loadingStatus === 'loading'}
				<div class="flex items-center justify-center py-12 text-gray-500">
					<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
					Loading workflows...
				</div>
			{:else if loadingStatus === 'error'}
				<div class="p-6">
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
						<strong>Error:</strong> {loadingError}
					</div>
				</div>
			{:else if workflows.length === 0}
				<div class="p-12 text-center text-gray-500">
					No workflows found. Create a workflow to see it here.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="bg-gray-50 border-b border-gray-200">
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Workflow ID
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Initiator
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Processes
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Submitted
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each workflows as workflow}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="font-mono text-xs text-gray-600">
											{workflow.processgraphid.substring(0, 12)}...
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{workflow.initiatorname || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getWorkflowStateColor(workflow.state)}">
											{getWorkflowStateLabel(workflow.state)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
										{workflow.processids?.length || 0}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
										{formatTime(workflow.submissiontime)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<button
											on:click={() => selectWorkflow(workflow)}
											class="text-blue-600 hover:text-blue-800 text-sm font-medium"
										>
											View DAG →
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Workflow Detail View with DAG -->
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<div class="flex items-center justify-between mb-6">
				<button
					on:click={backToList}
					class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to workflows
				</button>
				<button
					on:click={() => selectWorkflow(selectedWorkflow)}
					disabled={graphLoadingStatus === 'loading'}
					class="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded transition-colors"
				>
					{graphLoadingStatus === 'loading' ? 'Loading...' : 'Refresh'}
				</button>
			</div>

			{#if graphLoadingStatus === 'loading'}
				<div class="flex items-center justify-center py-12 text-gray-500">
					<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
					Loading workflow graph...
				</div>
			{:else if graphLoadingStatus === 'error'}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					<strong>Error:</strong> {graphLoadingError}
				</div>
			{:else if graphLoadingStatus === 'success' && graphData}
				<WorkflowDAG {graphData} workflowId={selectedWorkflow.processgraphid} />
			{/if}
		</div>
	{/if}
</div>
<script lang="ts">
	import { onMount } from 'svelte';
	import WorkflowDAG from '$lib/components/WorkflowDAG.svelte';
	import SubmitWorkflowModal from '$lib/components/SubmitWorkflowModal.svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import type { ColonyClient } from '$lib/api/colony';
	import ClientFactory from '$lib/utils/clientFactory';

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
	let colonyClient: ColonyClient | null = null;
	let colonyName = '';

	onMount(async () => {
		colonyClient = await ClientFactory.getColonyClient();
		colonyName = $appState.colonyName || envConfig.colonyName || '';
		await loadWorkflows();
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
			console.log('=== Fetching workflows list (all states) ===');
			console.log('Colony:', colonyName);

			// Fetch workflows for all states: WAITING (0), RUNNING (1), SUCCESS (2), FAILED (3)
			const states = [0, 1, 2, 3];
			const allWorkflows: ProcessGraph[] = [];

			for (const state of states) {
				try {
					const response = await colonyClient.getProcessGraphs(colonyName, 100, state);
					console.log(`=== getProcessGraphs Response for state ${state} ===`);
					console.log('Response:', JSON.stringify(response, null, 2));

					if (response && response.processgraphs && Array.isArray(response.processgraphs)) {
						allWorkflows.push(...response.processgraphs);
					} else if (response && Array.isArray(response)) {
						// Handle case where response is directly an array
						allWorkflows.push(...response);
					}
				} catch (error) {
					console.warn(`Failed to fetch workflows for state ${state}:`, error);
					// Continue with other states even if one fails
				}
			}

			workflows = allWorkflows;
			console.log(`Found ${workflows.length} total workflows across all states`);
			loadingStatus = 'success';
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

	let isRemoving = false;
	let showRemoveConfirm = false;
	let showSubmitModal = false;
	let isSubmitting = false;
	let submitError = '';

	async function removeWorkflow() {
		if (!colonyClient || !selectedWorkflow) {
			return;
		}

		isRemoving = true;
		try {
			console.log('Removing workflow:', selectedWorkflow.processgraphid);
			await colonyClient.removeProcessGraph(selectedWorkflow.processgraphid);
			console.log('Workflow removed successfully');

			// Go back to list and reload workflows
			backToList();
			await loadWorkflows();
		} catch (error) {
			console.error('Failed to remove workflow:', error);
			alert('Failed to remove workflow: ' + (error instanceof Error ? error.message : String(error)));
		} finally {
			isRemoving = false;
			showRemoveConfirm = false;
		}
	}

	function confirmRemove() {
		showRemoveConfirm = true;
	}

	function cancelRemove() {
		showRemoveConfirm = false;
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

	function openSubmitModal() {
		showSubmitModal = true;
		submitError = '';
	}

	function closeSubmitModal() {
		showSubmitModal = false;
		submitError = '';
	}

	async function handleWorkflowSubmitted() {
		closeSubmitModal();
		await loadWorkflows();
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Workflows</h1>
	</div>

	{#if !selectedWorkflow}
		<!-- Workflows List View -->
		<div class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-center">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Process Graphs</h2>
					<div class="flex gap-2">
						<button
							on:click={openSubmitModal}
							disabled={loadingStatus === 'loading'}
							class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
							title="Submit Workflow"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
						<button
							on:click={loadWorkflows}
							disabled={loadingStatus === 'loading'}
							class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
							title="Refresh"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			{#if loadingStatus === 'loading'}
				<div class="flex items-center justify-center py-12 text-gray-500 dark:text-slate-300">
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
				<div class="p-12 text-center text-gray-500 dark:text-slate-300">
					No workflows found. Create a workflow to see it here.
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 dark:bg-slate-600">
							<tr class="border-b border-gray-200 dark:border-slate-600">
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Workflow ID
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Initiator
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Processes
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Submitted
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="bg-white dark:bg-slate-700 divide-y divide-gray-200 dark:divide-slate-600">
							{#each workflows as workflow}
								<tr class="hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="font-mono text-xs text-gray-600 dark:text-slate-300">
											{workflow.processgraphid.substring(0, 12)}...
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
										{workflow.initiatorname || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getWorkflowStateColor(workflow.state)}">
											{getWorkflowStateLabel(workflow.state)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
										{workflow.processids?.length || 0}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
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
		<div class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
			<div class="flex items-center justify-between mb-6">
				<button
					on:click={backToList}
					class="flex items-center text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to workflows
				</button>
				<div class="flex gap-2">
					<button
						on:click={confirmRemove}
						disabled={isRemoving}
						class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-2 rounded transition-colors"
						title="Delete Workflow"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
					<button
						on:click={() => selectWorkflow(selectedWorkflow)}
						disabled={graphLoadingStatus === 'loading'}
						class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
						title="Refresh"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Confirmation Dialog -->
			{#if showRemoveConfirm}
				<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={cancelRemove}>
					<div class="bg-white dark:bg-slate-700 rounded-lg p-6 max-w-md w-full mx-4" on:click={(e) => e.stopPropagation()}>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Workflow Deletion</h3>
						<p class="text-gray-600 dark:text-slate-300 mb-4">
							Are you sure you want to delete this workflow?
						</p>
						<div class="bg-gray-50 dark:bg-slate-600 rounded p-3 mb-4">
							<p class="text-xs text-gray-500 dark:text-slate-400 mb-1">Workflow ID:</p>
							<p class="font-mono text-sm text-gray-900 dark:text-white break-all">{selectedWorkflow?.processgraphid}</p>
						</div>
						<p class="text-sm text-gray-600 dark:text-slate-300 mb-6">
							This action cannot be undone.
						</p>
						<div class="flex justify-end gap-3">
							<button
								on:click={cancelRemove}
								disabled={isRemoving}
								class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 rounded transition-colors"
							>
								Cancel
							</button>
							<button
								on:click={removeWorkflow}
								disabled={isRemoving}
								class="px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded transition-colors"
							>
								{isRemoving ? 'Deleting...' : 'Delete Workflow'}
							</button>
						</div>
					</div>
				</div>
			{/if}

			{#if graphLoadingStatus === 'loading'}
				<div class="flex items-center justify-center py-12 text-gray-500 dark:text-slate-300">
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

<!-- Submit Workflow Modal -->
<SubmitWorkflowModal
	bind:show={showSubmitModal}
	client={colonyClient}
	onWorkflowSubmitted={handleWorkflowSubmitted}
/>
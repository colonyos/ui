<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WorkflowDAG from '$lib/components/WorkflowDAG.svelte';
	import SubmitWorkflowModal from '$lib/components/SubmitWorkflowModal.svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import type { ColonyClient } from '$lib/api/colony';
	import ClientFactory from '$lib/utils/clientFactory';
	import { getProcessStateLabel, getProcessStateColor } from '$lib/types/process';
	import { formatDate } from '$lib/utils/dateUtils';

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

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let workflows = $state<ProcessGraph[]>([]);
	let selectedWorkflow = $state<ProcessGraph | null>(null);
	let graphData = $state<any>(null);
	let graphLoadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let graphLoadingError = $state('');
	let colonyClient = $state<ColonyClient | null>(null);
	let colonyName = $state('');
	let searchTerm = $state('');

	$effect(() => {
		(async () => {
			colonyClient = await ClientFactory.getColonyClient();
			colonyName = $appState.colonyName || envConfig.colonyName || '';
			await loadWorkflows();

			// Check if there's a workflow ID in the URL
			const urlWorkflowId = $page.url.searchParams.get('id');
			if (urlWorkflowId && colonyClient) {
				// Try to find the workflow in the loaded list
				const workflow = workflows.find(w => w.processgraphid === urlWorkflowId);
				if (workflow) {
					selectWorkflow(workflow);
				} else {
					// Workflow not in list, try to load it directly
					await loadWorkflowById(urlWorkflowId);
				}
			}
		})();
	});

	async function loadWorkflowById(workflowId: string) {
		if (!colonyClient) return;

		graphLoadingStatus = 'loading';
		graphLoadingError = '';
		graphData = null;

		try {
			graphData = await colonyClient.getProcessGraph(workflowId);

			if (graphData && graphData.nodes && graphData.edges) {
				// Create a minimal workflow object for display
				selectedWorkflow = {
					processgraphid: workflowId,
					initiatorname: graphData.initiatorname || '',
					colonyname: graphData.colonyname || colonyName,
					state: graphData.state ?? 0,
					submissiontime: graphData.submissiontime || '',
					starttime: graphData.starttime || '',
					endtime: graphData.endtime || '',
					processids: graphData.processids || []
				};
				graphLoadingStatus = 'success';
			} else {
				graphLoadingError = 'Invalid workflow graph data received from server';
				graphLoadingStatus = 'error';
				// Clear invalid URL
				goto('/workflows', { replaceState: true });
			}
		} catch (error) {
			console.error('Failed to load workflow from URL:', error);
			graphLoadingError = error instanceof Error ? error.message : String(error);
			graphLoadingStatus = 'error';
			// Clear invalid URL
			goto('/workflows', { replaceState: true });
		}
	}

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

			// Fetch workflows for all states in parallel: WAITING (0), RUNNING (1), SUCCESS (2), FAILED (3)
			const states = [0, 1, 2, 3];
			const allWorkflows: ProcessGraph[] = [];

			const results = await Promise.allSettled(
				states.map(state => colonyClient.getProcessGraphs(colonyName, 100, state))
			);

			// Process results from all parallel calls
			results.forEach((result, index) => {
				const state = states[index];

				if (result.status === 'fulfilled') {
					const response = result.value;
					if (import.meta.env.DEV) {
						console.log(`=== getProcessGraphs Response for state ${state} ===`);
						console.log('Response:', JSON.stringify(response, null, 2));
					}

					if (response && response.processgraphs && Array.isArray(response.processgraphs)) {
						allWorkflows.push(...response.processgraphs);
					} else if (response && Array.isArray(response)) {
						// Handle case where response is directly an array
						allWorkflows.push(...response);
					}
				} else {
					console.warn(`Failed to fetch workflows for state ${state}:`, result.reason);
					// Continue with other states even if one fails
				}
			});

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

		// Update URL with workflow ID
		goto(`/workflows?id=${workflow.processgraphid}`, { replaceState: true });

		try {
			if (import.meta.env.DEV) {
				console.log('=== Fetching workflow graph data ===');
				console.log('Workflow ID:', workflow.processgraphid);
			}

			graphData = await colonyClient.getProcessGraph(workflow.processgraphid);

			if (import.meta.env.DEV) {
				console.log('=== getProcessGraph Response ===');
				console.log('Full response:', JSON.stringify(graphData, null, 2));
			}

			if (graphData && graphData.nodes && graphData.edges) {
				if (import.meta.env.DEV) {
					console.log('Graph structure loaded:', {
						nodes: graphData.nodes.length,
						edges: graphData.edges.length
					});
				}
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
		// Clear URL parameter
		goto('/workflows', { replaceState: true });
	}

	let isRemoving = $state(false);
	let showRemoveConfirm = $state(false);
	let showSubmitModal = $state(false);
	let isSubmitting = $state(false);
	let submitError = $state('');

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

	// Filter workflows based on search term
	let filteredWorkflows = $derived(
		workflows.filter(workflow =>
			workflow.processgraphid.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);


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
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Process Graphs</h2>
					<div class="flex gap-2">
						<button
							onclick={openSubmitModal}
							disabled={loadingStatus === 'loading'}
							aria-label="Submit Workflow"
							class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
							title="Submit Workflow"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
						<button
							onclick={loadWorkflows}
							disabled={loadingStatus === 'loading'}
							aria-label="Refresh"
							class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
							title="Refresh"
						>
							{#if loadingStatus === 'loading'}
								<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							{/if}
						</button>
					</div>
				</div>
				<!-- Search Filter -->
				<div class="flex items-center gap-2 max-w-md">
					<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="Filter by workflow ID..."
						class="w-80 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					{#if searchTerm}
						<button
							onclick={() => searchTerm = ''}
							class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
							title="Clear filter"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Error State -->
			{#if loadingStatus === 'error'}
				<div class="p-6">
					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
						<strong>Error:</strong> {loadingError}
					</div>
				</div>
			{/if}

			<!-- Table (always visible) -->
			{#if filteredWorkflows.length === 0}
				<div class="p-12 text-center text-gray-500 dark:text-slate-300">
					{#if loadingStatus === 'loading'}
						Loading workflows...
					{:else if searchTerm}
						No workflows match the filter "{searchTerm}"
					{:else}
						No workflows found. Create a workflow to see it here.
					{/if}
				</div>
			{:else}
				<div class="table-container">
					<table class="table-base">
						<thead class="table-header">
							<tr>
								<th class="table-header-cell">
									Workflow ID
								</th>
								<th class="table-header-cell">
									Initiator
								</th>
								<th class="table-header-cell">
									Status
								</th>
								<th class="table-header-cell">
									Processes
								</th>
								<th class="table-header-cell">
									Submitted
								</th>
								<th class="table-header-cell">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="table-body">
							{#each filteredWorkflows as workflow}
								<tr class="table-row">
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="font-mono text-xs text-gray-600 dark:text-slate-300">
											{workflow.processgraphid.substring(0, 12)}...
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
										{workflow.initiatorname || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getProcessStateColor(workflow.state)}">
											{getProcessStateLabel(workflow.state)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
										{workflow.processids?.length || 0}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
										{formatDate(workflow.submissiontime)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<button
											onclick={() => selectWorkflow(workflow)}
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
					onclick={backToList}
					class="flex items-center text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to workflows
				</button>
				<div class="flex gap-2">
					<button
						onclick={confirmRemove}
						disabled={isRemoving}
						aria-label="Delete Workflow"
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
						onclick={() => selectWorkflow(selectedWorkflow)}
						disabled={graphLoadingStatus === 'loading'}
						aria-label="Refresh"
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
				<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={cancelRemove} onkeydown={(e) => e.key === 'Escape' && cancelRemove()}>
					<div class="bg-white dark:bg-slate-700 rounded-lg p-6 max-w-md w-full mx-4" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
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
								onclick={cancelRemove}
								disabled={isRemoving}
								class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 rounded transition-colors"
							>
								Cancel
							</button>
							<button
								onclick={removeWorkflow}
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
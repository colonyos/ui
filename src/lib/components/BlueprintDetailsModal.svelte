<script lang="ts">
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';
	import { ColonyClient } from '$lib/api/colony';
	import DeployBlueprintModal from './DeployBlueprintModal.svelte';
	import ClientFactory from '$lib/utils/clientFactory';
	import { formatDate } from '$lib/utils/dateUtils';
	import { getProcessStateColor, getProcessStateLabel } from '$lib/types/process';

	interface Props {
		show: boolean;
		blueprint: Blueprint | BlueprintDefinition | null;
		client: ColonyClient | null;
		onClose: () => void;
	}

	let { show, blueprint, client, onClose }: Props = $props();

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let loadingError = $state('');
	let blueprintDetails: Blueprint | BlueprintDefinition | null = $state(null);
	let showDeployModal = $state(false);
	let showFullSpec = $state(false);
	let isDefinition = $state(false);

	// Reconciliation process state
	let reconciliationProcess: any = $state(null);
	let reconciliationProcessLoading = $state(false);

	// Replicas update state
	let replicasInputValue = $state<number | string>('');
	let isUpdatingReplicas = $state(false);
	let replicasUpdateError = $state('');
	let replicasUpdateSuccess = $state(false);

	$effect(() => {
		if (show && blueprint && client) {
			showFullSpec = false; // Reset collapse state when opening
			replicasUpdateError = '';
			replicasUpdateSuccess = false;
			loadBlueprintDetails();
		}
	});

	async function loadBlueprintDetails() {
		if (!blueprint || !client) return;

		loadingStatus = 'loading';
		loadingError = '';
		blueprintDetails = null;
		reconciliationProcess = null;

		try {
			// Determine if this is a blueprint definition or instance
			isDefinition = 'blueprintdefinitionid' in blueprint;

			if (blueprint.metadata.name && blueprint.metadata.namespace) {
				let result;
				if (isDefinition) {
					// Get blueprint definition by namespace (colony name) and name
					result = await client.getBlueprintDefinition(
						blueprint.metadata.namespace,
						blueprint.metadata.name
					);
				} else {
					// Get blueprint instance by name and namespace
					result = await client.getBlueprintByName(
						blueprint.metadata.name,
						blueprint.metadata.namespace
					);
				}
				blueprintDetails = result;
				loadingStatus = 'success';

				// Initialize replicas input value if this is an instance
				if (!isDefinition && (blueprintDetails.spec as any)?.replicas !== undefined) {
					replicasInputValue = (blueprintDetails.spec as any).replicas;
				}

				// Load reconciliation process if this is an instance
				if (!isDefinition && blueprintDetails.metadata?.lastReconciliationProcess) {
					await loadReconciliationProcess(blueprintDetails.metadata.lastReconciliationProcess);
				}
			} else {
				throw new Error('Blueprint has no name or namespace');
			}
		} catch (error) {
			console.error('Failed to load blueprint details:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	async function loadReconciliationProcess(processId: string) {
		if (!processId) return;

		reconciliationProcessLoading = true;
		try {
			const generalClient = await ClientFactory.getGeneralClient();
			const process = await generalClient.getProcess(processId);
			reconciliationProcess = process;
		} catch (error) {
			console.error('Failed to load reconciliation process:', error);
			// Don't fail the whole modal if we can't load the process
			reconciliationProcess = null;
		} finally {
			reconciliationProcessLoading = false;
		}
	}



	function getSortedSchemaProperties(properties: any, required: string[]): [string, any][] {
		const entries = Object.entries(properties);
		return entries.sort(([nameA], [nameB]) => {
			const aIsRequired = required.includes(nameA);
			const bIsRequired = required.includes(nameB);

			// Required fields first
			if (aIsRequired && !bIsRequired) return -1;
			if (!aIsRequired && bIsRequired) return 1;

			// Alphabetically within each group
			return nameA.localeCompare(nameB);
		});
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function openDeployModal() {
		showDeployModal = true;
	}

	function closeDeployModal() {
		showDeployModal = false;
	}

	function handleBlueprintDeployed() {
		showDeployModal = false;
		// Optionally refresh or show success message
	}

	async function updateReplicas() {
		if (!blueprintDetails || !client || isDefinition) return;

		// Validate input
		const newReplicas = Number(replicasInputValue);
		if (isNaN(newReplicas) || newReplicas < 0 || !Number.isInteger(newReplicas)) {
			replicasUpdateError = 'Replicas must be a non-negative integer';
			return;
		}

		// Check if value has changed
		if (newReplicas === (blueprintDetails.spec as any)?.replicas) {
			replicasUpdateError = 'Replicas value has not changed';
			return;
		}

		isUpdatingReplicas = true;
		replicasUpdateError = '';
		replicasUpdateSuccess = false;

		try {
			// Create updated blueprint object
			const updatedBlueprint = {
				...blueprintDetails,
				spec: {
					...(blueprintDetails.spec as any),
					replicas: newReplicas
				}
			};

			// Call the updateBlueprint RPC
			await client.updateBlueprint(updatedBlueprint);

			// Success - refresh the details
			replicasUpdateSuccess = true;
			await loadBlueprintDetails();
			// The timeout is now handled by the $effect below
		} catch (error) {
			console.error('Failed to update replicas:', error);
			replicasUpdateError = error instanceof Error ? error.message : String(error);
		} finally {
			isUpdatingReplicas = false;
		}
	}

	// Effect to clear success message after 3 seconds with proper cleanup
	$effect(() => {
		if (replicasUpdateSuccess) {
			const timeoutId = setTimeout(() => {
				replicasUpdateSuccess = false;
			}, 3000);

			return () => clearTimeout(timeoutId);
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							{isDefinition ? 'Blueprint Definition Details' : 'Blueprint Details'}
						</h3>
						{#if blueprint}
							<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">{blueprint.metadata.name}</p>
							<p class="text-xs text-gray-400 dark:text-slate-400 font-mono">
								{'blueprintdefinitionid' in blueprint ? blueprint.blueprintdefinitionid : blueprint.blueprintid}
							</p>
						{/if}
					</div>
					<button
						onclick={onClose}
						aria-label="Close"
						class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
				{#if loadingStatus === 'loading'}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
						<span class="text-gray-600 dark:text-slate-300">Loading blueprint details...</span>
					</div>
				{:else if loadingStatus === 'error'}
					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
						<strong>Error:</strong> {loadingError}
					</div>
				{:else if loadingStatus === 'success' && blueprintDetails}
					<div class="space-y-6">
						{#if isDefinition}
							<!-- CRD Information (Definitions only) -->
							<div>
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">CRD Information</h4>
							<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 space-y-2">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Name:</span>
										<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.metadata.name}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Colony:</span>
										<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.metadata.namespace || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Kind:</span>
										<span class="text-gray-900 dark:text-white ml-2">{(blueprintDetails.spec as any)?.names?.kind || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Plural:</span>
										<span class="text-gray-900 dark:text-white ml-2">{(blueprintDetails.spec as any)?.names?.plural || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Singular:</span>
										<span class="text-gray-900 dark:text-white ml-2">{(blueprintDetails.spec as any)?.names?.singular || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Group:</span>
										<span class="text-gray-900 dark:text-white ml-2 font-mono text-xs">{(blueprintDetails.spec as any)?.group || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Version:</span>
										<span class="text-gray-900 dark:text-white ml-2">{(blueprintDetails.spec as any)?.version || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Scope:</span>
										<span class="text-gray-900 dark:text-white ml-2">{(blueprintDetails.spec as any)?.scope || '-'}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Handler Information -->
						{#if (blueprintDetails.spec as any)?.handler}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Handler</h4>
								<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										<div>
											<span class="font-medium text-blue-700 dark:text-blue-300">Executor Type:</span>
											<span class="text-blue-900 dark:text-blue-100 ml-2">{(blueprintDetails.spec as any).handler.executorType || '-'}</span>
										</div>
										<div>
											<span class="font-medium text-blue-700 dark:text-blue-300">Function Name:</span>
											<span class="text-blue-900 dark:text-blue-100 ml-2">{(blueprintDetails.spec as any).handler.functionName || '-'}</span>
										</div>
									</div>
								</div>
							</div>
						{/if}

						<!-- Schema Properties -->
						{#if (blueprintDetails.spec as any)?.schema?.properties}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Schema Properties</h4>
								<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
									<div class="space-y-3">
										{#each getSortedSchemaProperties((blueprintDetails.spec as any).schema.properties, (blueprintDetails.spec as any).schema.required || []) as [propName, propSpec]}
											<div class="border-b border-purple-200 dark:border-purple-700 pb-3 last:border-b-0 last:pb-0">
												<div class="flex items-start gap-2">
													<span class="font-semibold text-purple-900 dark:text-purple-100">{propName}</span>
													<span class="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
														{(propSpec as any).type || 'any'}
													</span>
													{#if (blueprintDetails.spec as any).schema.required?.includes(propName)}
														<span class="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">
															required
														</span>
													{/if}
												</div>
												{#if (propSpec as any).description}
													<p class="text-sm text-purple-700 dark:text-purple-300 mt-1 ml-0">
														{(propSpec as any).description}
													</p>
												{/if}
												{#if (propSpec as any).default !== undefined}
													<p class="text-xs text-purple-600 dark:text-purple-400 mt-1 ml-0">
														Default: <code class="bg-purple-100 dark:bg-purple-900 px-1 rounded">{JSON.stringify((propSpec as any).default)}</code>
													</p>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<!-- Blueprint Instance Information -->
						<div>
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Blueprint Information</h4>
							<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 space-y-2">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Name:</span>
										<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.metadata.name}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Colony:</span>
										<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.metadata.namespace || '-'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Kind:</span>
										<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.kind || '-'}</span>
									</div>
									{#if blueprintDetails.metadata.createdAt}
										<div>
											<span class="font-medium text-gray-700 dark:text-slate-300">Created:</span>
											<span class="text-gray-900 dark:text-white ml-2">{formatDate(blueprintDetails.metadata.createdAt)}</span>
										</div>
									{/if}
									{#if blueprintDetails.metadata.updatedAt}
										<div>
											<span class="font-medium text-gray-700 dark:text-slate-300">Updated:</span>
											<span class="text-gray-900 dark:text-white ml-2">{formatDate(blueprintDetails.metadata.updatedAt)}</span>
										</div>
									{/if}
									{#if blueprintDetails.metadata.generation}
										<div>
											<span class="font-medium text-gray-700 dark:text-slate-300">Generation:</span>
											<span class="text-gray-900 dark:text-white ml-2">{blueprintDetails.metadata.generation}</span>
										</div>
									{/if}
									{#if blueprintDetails.metadata.lastReconciliationTime}
										<div>
											<span class="font-medium text-gray-700 dark:text-slate-300">Last Reconciliation:</span>
											<span class="text-gray-900 dark:text-white ml-2">{formatDate(blueprintDetails.metadata.lastReconciliationTime)}</span>
										</div>
									{/if}
									{#if blueprintDetails.metadata.lastReconciliationProcess}
										<div>
											<span class="font-medium text-gray-700 dark:text-slate-300">Reconciliation Status:</span>
											{#if reconciliationProcessLoading}
												<span class="ml-2 text-gray-500 dark:text-slate-400 text-xs">Loading...</span>
											{:else if reconciliationProcess}
												<span class="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full {getProcessStateColor(reconciliationProcess.state ?? 0)}">
													{getProcessStateLabel(reconciliationProcess.state ?? 0)}
												</span>
											{:else}
												<span class="ml-2 text-gray-500 dark:text-slate-400 text-xs">Unknown</span>
											{/if}
										</div>
									{/if}
								</div>
								{#if blueprintDetails.metadata.lastReconciliationProcess}
									<div class="mt-3 pt-3 border-t border-gray-200 dark:border-slate-500">
										<div class="text-xs">
											<span class="font-medium text-gray-700 dark:text-slate-300">Last Reconciliation Process:</span>
											<div class="mt-1 font-mono text-gray-600 dark:text-slate-400 break-all">
												{blueprintDetails.metadata.lastReconciliationProcess}
											</div>
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Spec Details -->
						{#if (blueprintDetails.spec as any) && Object.keys(blueprintDetails.spec as any).length > 0}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Specification</h4>
								<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										{#if (blueprintDetails.spec as any).replicas !== undefined}
											<div class="md:col-span-2">
												<div class="flex flex-col gap-2">
													<div class="flex items-center gap-3">
														<span class="font-medium text-purple-700 dark:text-purple-300">Replicas:</span>
														<input
															type="number"
															bind:value={replicasInputValue}
															disabled={isUpdatingReplicas}
															min="0"
															step="1"
															class="px-3 py-1 border border-purple-300 dark:border-purple-700 rounded bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 w-24"
														/>
														<button
															onclick={updateReplicas}
															disabled={isUpdatingReplicas}
															class="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded transition-colors flex items-center gap-2"
															title="Update replicas"
														>
															{#if isUpdatingReplicas}
																<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
																<span>Updating...</span>
															{:else}
																<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																</svg>
																<span>Update</span>
															{/if}
														</button>
													</div>
													{#if replicasUpdateError}
														<div class="text-red-600 dark:text-red-400 text-xs">
															{replicasUpdateError}
														</div>
													{/if}
													{#if replicasUpdateSuccess}
														<div class="text-green-600 dark:text-green-400 text-xs">
															Replicas updated successfully!
														</div>
													{/if}
												</div>
											</div>
										{/if}
										{#if (blueprintDetails.spec as any).executorType}
											<div>
												<span class="font-medium text-purple-700 dark:text-purple-300">Executor Type:</span>
												<span class="text-purple-900 dark:text-purple-100 ml-2">{(blueprintDetails.spec as any).executorType}</span>
											</div>
										{/if}
										{#if (blueprintDetails.spec as any).image}
											<div class="md:col-span-2">
												<span class="font-medium text-purple-700 dark:text-purple-300">Image:</span>
												<div class="text-purple-900 dark:text-purple-100 mt-1 font-mono text-xs break-all">
													{(blueprintDetails.spec as any).image}
												</div>
											</div>
										{/if}
										{#if (blueprintDetails.spec as any).cpu}
											<div>
												<span class="font-medium text-purple-700 dark:text-purple-300">CPU:</span>
												<span class="text-purple-900 dark:text-purple-100 ml-2">{(blueprintDetails.spec as any).cpu}</span>
											</div>
										{/if}
										{#if (blueprintDetails.spec as any).memory}
											<div>
												<span class="font-medium text-purple-700 dark:text-purple-300">Memory:</span>
												<span class="text-purple-900 dark:text-purple-100 ml-2">{(blueprintDetails.spec as any).memory}</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						<!-- Status Information (if available) -->
						{#if (blueprintDetails as any).status && Object.keys((blueprintDetails as any).status).length > 0}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Status</h4>
								<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
									<pre class="text-blue-900 dark:text-blue-100 font-mono text-xs whitespace-pre-wrap overflow-x-auto">{JSON.stringify((blueprintDetails as any).status, null, 2)}</pre>
								</div>
							</div>
						{/if}
					{/if}

					<!-- Full Specification (Raw JSON) - Collapsible -->
					{#if blueprintDetails.spec && Object.keys(blueprintDetails.spec).length > 0}
						<div>
							<button
								onclick={() => showFullSpec = !showFullSpec}
								class="w-full flex items-center justify-between text-md font-medium text-gray-900 dark:text-white mb-3 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
							>
								<span>Full Specification (JSON)</span>
								<svg
									class="w-5 h-5 transition-transform {showFullSpec ? 'rotate-180' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							{#if showFullSpec}
								<div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
									<div class="bg-white dark:bg-slate-800 rounded border border-green-200 dark:border-green-800 p-4 text-xs">
										<pre class="text-green-900 dark:text-green-100 font-mono whitespace-pre-wrap overflow-x-auto">{JSON.stringify(blueprintDetails.spec, null, 2)}</pre>
									</div>
								</div>
							{/if}
						</div>
					{/if}
					</div>
				{:else}
					<div class="text-center py-8 text-gray-500 dark:text-slate-400">
						No details available
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600 flex justify-between">
				<div>
					{#if isDefinition}
						<button
							onclick={openDeployModal}
							disabled={loadingStatus !== 'success' || !blueprintDetails}
							class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2"
							title="Deploy a new blueprint instance"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Deploy Blueprint
						</button>
					{/if}
				</div>
				<button
					onclick={onClose}
					class="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-lg transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Deploy Blueprint Modal -->
<DeployBlueprintModal
	show={showDeployModal}
	blueprintDefinition={blueprintDetails}
	client={client}
	onClose={closeDeployModal}
	onBlueprintDeployed={handleBlueprintDeployed}
/>

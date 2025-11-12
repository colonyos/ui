<script lang="ts">
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';
	import { ColonyClient } from '$lib/api/colony';
	import DeployBlueprintModal from './DeployBlueprintModal.svelte';

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

	$effect(() => {
		if (show && blueprint && client) {
			showFullSpec = false; // Reset collapse state when opening
			loadBlueprintDetails();
		}
	});

	async function loadBlueprintDetails() {
		if (!blueprint || !client) return;

		loadingStatus = 'loading';
		loadingError = '';
		blueprintDetails = null;

		try {
			// Get blueprint definition by namespace (colony name) and name
			if (blueprint.metadata.name && blueprint.metadata.namespace) {
				const result = await client.getBlueprintDefinition(
					blueprint.metadata.namespace,
					blueprint.metadata.name
				);
				blueprintDetails = result;
				loadingStatus = 'success';
			} else {
				throw new Error('Blueprint definition has no name or namespace');
			}
		} catch (error) {
			console.error('Failed to load blueprint definition details:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function formatDate(dateString?: string): string {
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			return 'Never';
		}
		return new Date(dateString).toLocaleString();
	}

	function generateExampleBlueprint(blueprintDef: Blueprint | BlueprintDefinition | null): string {
		if (!blueprintDef) return '{}';

		const spec = (blueprintDef.spec as any);
		const kind = spec?.names?.kind || 'Resource';
		const namespace = blueprintDef.metadata?.namespace || 'default';

		const example: any = {
			kind: kind,
			metadata: {
				name: `my-${kind.toLowerCase()}`,
				namespace: namespace
			}
		};

		// Generate spec from schema properties
		if (spec?.schema?.properties) {
			const exampleSpec: any = {};
			const properties = spec.schema.properties;
			const required = spec.schema.required || [];

			Object.entries(properties).forEach(([propName, propDef]: [string, any]) => {
				// Generate example value based on type
				let exampleValue: any;

				switch (propDef.type) {
					case 'string':
						if (propDef.enum && propDef.enum.length > 0) {
							exampleValue = propDef.enum[0];
						} else if (propDef.description?.includes('image')) {
							exampleValue = 'myregistry/my-image:latest';
						} else if (propDef.description?.includes('type')) {
							exampleValue = 'my-type';
						} else {
							exampleValue = `example-${propName}`;
						}
						break;
					case 'number':
					case 'integer':
						exampleValue = propDef.default !== undefined ? propDef.default : 1;
						break;
					case 'boolean':
						exampleValue = propDef.default !== undefined ? propDef.default : false;
						break;
					case 'array':
						if (propDef.items?.type === 'object') {
							// For array of objects, show one example
							const objExample: any = {};
							if (propDef.items.properties) {
								Object.entries(propDef.items.properties).forEach(([key, val]: [string, any]) => {
									if (val.type === 'string') {
										objExample[key] = val.enum ? val.enum[0] : `example-${key}`;
									} else if (val.type === 'number') {
										objExample[key] = 8080;
									}
								});
							}
							exampleValue = [objExample];
						} else {
							exampleValue = [`item1`, `item2`];
						}
						break;
					case 'object':
						exampleValue = {
							"KEY1": "value1",
							"KEY2": "value2"
						};
						break;
					default:
						exampleValue = null;
				}

				// Include if required or has a default
				if (required.includes(propName) || propDef.default !== undefined) {
					exampleSpec[propName] = exampleValue;
				}
			});

			if (Object.keys(exampleSpec).length > 0) {
				example.spec = exampleSpec;
			}
		}

		return JSON.stringify(example, null, 2);
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
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Blueprint Definition Details</h3>
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
						<!-- CRD Information -->
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
										{#each Object.entries((blueprintDetails.spec as any).schema.properties) as [propName, propSpec]}
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

						<!-- Example Blueprint -->
						{#if (blueprintDetails.spec as any)?.schema?.properties}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Example Blueprint</h4>
								<div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
									<p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
										This is an example of a blueprint that can be created from this definition. Copy and modify it to create your own resource.
									</p>
									<div class="bg-white dark:bg-slate-800 rounded border border-yellow-200 dark:border-yellow-800 p-4">
										<pre class="text-yellow-900 dark:text-yellow-100 font-mono text-xs whitespace-pre-wrap overflow-x-auto">{generateExampleBlueprint(blueprintDetails)}</pre>
									</div>
								</div>
							</div>
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

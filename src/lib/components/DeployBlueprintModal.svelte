<script lang="ts">
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';
	import type { ColonyClient } from '$lib/api/colony';

	interface Props {
		show: boolean;
		blueprintDefinition: Blueprint | BlueprintDefinition | null;
		client: ColonyClient | null;
		onClose: () => void;
		onBlueprintDeployed?: () => void;
	}

	let { show, blueprintDefinition, client, onClose, onBlueprintDeployed }: Props = $props();

	let deployStatus: 'idle' | 'deploying' | 'success' | 'error' = $state('idle');
	let deployError = $state('');

	// Form state
	let blueprintName = $state('');
	let blueprintNamespace = $state('');
	let formValues = $state<Record<string, any>>({});

	$effect(() => {
		if (show && blueprintDefinition) {
			resetForm();
		}
	});

	function resetForm() {
		if (!blueprintDefinition) return;

		const spec = (blueprintDefinition.spec as any);
		const kind = spec?.names?.kind || 'Resource';

		// Set default metadata values
		blueprintName = `my-${kind.toLowerCase()}`;
		blueprintNamespace = blueprintDefinition.metadata?.namespace || '';

		// Initialize form values from schema
		const newFormValues: Record<string, any> = {};
		if (spec?.schema?.properties) {
			Object.entries(spec.schema.properties).forEach(([propName, propDef]: [string, any]) => {
				// Set default values
				if (propDef.default !== undefined) {
					newFormValues[propName] = propDef.default;
				} else if (propDef.type === 'string') {
					newFormValues[propName] = '';
				} else if (propDef.type === 'number' || propDef.type === 'integer') {
					newFormValues[propName] = 0;
				} else if (propDef.type === 'boolean') {
					newFormValues[propName] = false;
				} else if (propDef.type === 'array') {
					newFormValues[propName] = [];
				} else if (propDef.type === 'object') {
					newFormValues[propName] = {};
				}
			});
		}
		formValues = newFormValues;
		deployStatus = 'idle';
		deployError = '';
	}

	async function handleDeploy() {
		if (!client || !blueprintDefinition) {
			deployError = 'Client or blueprint definition not available';
			deployStatus = 'error';
			return;
		}

		const spec = (blueprintDefinition.spec as any);
		const kind = spec?.names?.kind || 'Resource';

		if (!blueprintName.trim()) {
			deployError = 'Blueprint name is required';
			deployStatus = 'error';
			return;
		}

		if (!blueprintNamespace.trim()) {
			deployError = 'Namespace is required';
			deployStatus = 'error';
			return;
		}

		// Validate required fields
		const required = spec?.schema?.required || [];
		for (const fieldName of required) {
			if (!formValues[fieldName] || (typeof formValues[fieldName] === 'string' && !formValues[fieldName].trim())) {
				deployError = `Required field "${fieldName}" is missing`;
				deployStatus = 'error';
				return;
			}
		}

		deployStatus = 'deploying';
		deployError = '';

		try {
			// Build the blueprint object to deploy
			const blueprintToCreate = {
				kind: kind,
				metadata: {
					name: blueprintName.trim(),
					namespace: blueprintNamespace.trim()
				},
				spec: { ...formValues }
			};

			// Call addBlueprint to create the instance
			await client.addBlueprint(blueprintToCreate);

			deployStatus = 'success';

			// Wait a bit to show success message, then close
			setTimeout(() => {
				onBlueprintDeployed?.();
				onClose();
			}, 1500);
		} catch (error) {
			console.error('Failed to deploy blueprint:', error);
			deployError = error instanceof Error ? error.message : String(error);
			deployStatus = 'error';
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function renderFormField(propName: string, propDef: any, required: string[]) {
		const isRequired = required.includes(propName);
		const fieldId = `field-${propName}`;

		switch (propDef.type) {
			case 'string':
				if (propDef.enum) {
					return { type: 'select', options: propDef.enum };
				}
				return { type: 'text' };
			case 'number':
			case 'integer':
				return { type: 'number' };
			case 'boolean':
				return { type: 'checkbox' };
			case 'object':
				return { type: 'json' };
			case 'array':
				return { type: 'json' };
			default:
				return { type: 'text' };
		}
	}
</script>

{#if show}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							Deploy Blueprint: {(blueprintDefinition?.spec as any)?.names?.kind || 'Resource'}
						</h3>
						<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
							Fill in the fields below to create a new blueprint instance
						</p>
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

			<!-- Body -->
			<div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
				<div class="space-y-4">
					<!-- Metadata Section -->
					<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
						<h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Metadata</h4>

						<!-- Name -->
						<div class="mb-3">
							<label for="blueprint-name" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								Name <span class="text-red-600">*</span>
							</label>
							<input
								id="blueprint-name"
								type="text"
								bind:value={blueprintName}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
								placeholder="my-resource-name"
								required
							/>
						</div>

						<!-- Namespace -->
						<div>
							<label for="blueprint-namespace" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								Namespace (Colony) <span class="text-red-600">*</span>
							</label>
							<input
								id="blueprint-namespace"
								type="text"
								bind:value={blueprintNamespace}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
								placeholder="colony-name"
								required
							/>
						</div>
					</div>

					<!-- Spec Fields Section -->
					{#if (blueprintDefinition?.spec as any)?.schema?.properties}
						<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
							<h4 class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Specification</h4>
							<div class="space-y-4">
								{#each Object.entries((blueprintDefinition.spec as any).schema.properties) as [propName, propDef]}
									{@const fieldInfo = renderFormField(propName, propDef, (blueprintDefinition.spec as any).schema.required || [])}
									{@const isRequired = ((blueprintDefinition.spec as any).schema.required || []).includes(propName)}

									<div>
										<label for="field-{propName}" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
											{propName}
											{#if isRequired}<span class="text-red-600">*</span>{/if}
											<span class="text-xs text-gray-500 dark:text-slate-400 ml-1">({(propDef as any).type})</span>
										</label>

										{#if (propDef as any).description}
											<p class="text-xs text-gray-600 dark:text-slate-400 mb-1">{(propDef as any).description}</p>
										{/if}

										{#if fieldInfo.type === 'select'}
											<select
												id="field-{propName}"
												bind:value={formValues[propName]}
												class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
												required={isRequired}
											>
												<option value="">Select...</option>
												{#each fieldInfo.options as option}
													<option value={option}>{option}</option>
												{/each}
											</select>
										{:else if fieldInfo.type === 'checkbox'}
											<div class="flex items-center">
												<input
													id="field-{propName}"
													type="checkbox"
													bind:checked={formValues[propName]}
													class="w-4 h-4 text-purple-600 border-gray-300 dark:border-slate-600 rounded focus:ring-purple-500"
												/>
												<span class="ml-2 text-sm text-gray-700 dark:text-slate-300">Enable</span>
											</div>
										{:else if fieldInfo.type === 'number'}
											<input
												id="field-{propName}"
												type="number"
												bind:value={formValues[propName]}
												class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
												required={isRequired}
											/>
										{:else if fieldInfo.type === 'json'}
											<textarea
												id="field-{propName}"
												bind:value={formValues[propName]}
												rows="4"
												class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
												placeholder={JSON.stringify((propDef as any).type === 'array' ? [] : {}, null, 2)}
												required={isRequired}
											></textarea>
										{:else}
											<input
												id="field-{propName}"
												type="text"
												bind:value={formValues[propName]}
												class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
												placeholder="Enter {propName}"
												required={isRequired}
											/>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Status Messages -->
					{#if deployStatus === 'error'}
						<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
							<div class="flex items-start gap-2">
								<svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
								</svg>
								<div class="flex-1">
									<strong class="font-semibold">Error:</strong>
									<p class="mt-1 text-sm">{deployError}</p>
								</div>
							</div>
						</div>
					{:else if deployStatus === 'success'}
						<div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
							<div class="flex items-start gap-2">
								<svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
								<div class="flex-1">
									<strong class="font-semibold">Success:</strong>
									<p class="mt-1 text-sm">Blueprint deployed successfully!</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600">
				<div class="flex justify-end gap-3">
					<button
						onclick={onClose}
						disabled={deployStatus === 'deploying'}
						class="px-4 py-2 border border-gray-300 dark:border-slate-500 rounded-lg text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-500 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
					<button
						onclick={handleDeploy}
						disabled={deployStatus === 'deploying' || deployStatus === 'success'}
						class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
					>
						{#if deployStatus === 'deploying'}
							<div class="flex items-center">
								<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
								Deploying...
							</div>
						{:else}
							Deploy
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

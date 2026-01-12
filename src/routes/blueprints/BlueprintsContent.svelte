<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import BlueprintTable from '$lib/components/BlueprintTable.svelte';
	import BlueprintDetailsModal from '$lib/components/BlueprintDetailsModal.svelte';
	import AddBlueprintModal from '$lib/components/AddBlueprintModal.svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';
	import ClientFactory from '$lib/utils/clientFactory';
	import { envConfig } from '$lib/config/env';

	// Determine active tab from URL
	let activeTab = $derived($page.url.pathname === '/blueprint-definitions' ? 'definitions' : 'blueprints');

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let allBlueprintDefinitions = $state<BlueprintDefinition[]>([]);
	let allBlueprints = $state<Blueprint[]>([]);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showBlueprintDetails = $state(false);
	let selectedBlueprintForDetails = $state<BlueprintDefinition | Blueprint | null>(null);
	let showAddBlueprintModal = $state(false);

	$effect(() => {
		(async () => {
			colonyClient = await ClientFactory.getColonyClient();
			// Data will be loaded by the $effect below

			// Check if there's a blueprint ID in the URL
			const urlId = $page.url.searchParams.get('id');
			if (urlId) {
				if (activeTab === 'definitions') {
					// Find in definitions
					const def = allBlueprintDefinitions.find(d => d.blueprintdefinitionid === urlId);
					if (def) {
						selectedBlueprintForDetails = def;
						showBlueprintDetails = true;
					} else {
						// Create minimal object to trigger modal
						selectedBlueprintForDetails = { blueprintdefinitionid: urlId } as BlueprintDefinition;
						showBlueprintDetails = true;
					}
				} else {
					// Find in blueprints
					const bp = allBlueprints.find(b => b.blueprintid === urlId);
					if (bp) {
						selectedBlueprintForDetails = bp;
						showBlueprintDetails = true;
					} else {
						// Create minimal object to trigger modal
						selectedBlueprintForDetails = { blueprintid: urlId } as Blueprint;
						showBlueprintDetails = true;
					}
				}
			}
		})();
	});

	// Reload data when tab changes via URL
	$effect(() => {
		if (colonyClient) {
			// Access activeTab to make this effect reactive to URL changes
			const tab = activeTab;
			loadData();
		}
	});

	async function loadData() {
		if (activeTab === 'definitions') {
			await loadBlueprintDefinitions();
		} else {
			await loadBlueprintInstances();
		}
	}

	async function loadBlueprintDefinitions() {
		if (!colonyClient) {
			loadingError = 'Colony client not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		const colonyName = envConfig.colonyName;
		if (!colonyName) {
			loadingError = 'Colony name not configured. Check environment variables.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allBlueprintDefinitions = [];

		try {
			const blueprintDefinitions = await colonyClient.getBlueprintDefinitions(colonyName);
			allBlueprintDefinitions = Array.isArray(blueprintDefinitions) ? blueprintDefinitions : [];
			loadingStatus = 'success';
		} catch (error) {
			console.error('Failed to load blueprint definitions:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	async function loadBlueprintInstances() {
		if (!colonyClient) {
			loadingError = 'Colony client not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		const colonyName = envConfig.colonyName;
		if (!colonyName) {
			loadingError = 'Colony name not configured. Check environment variables.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allBlueprints = [];

		try {
			const blueprints = await colonyClient.getAllBlueprints(colonyName);
			allBlueprints = Array.isArray(blueprints) ? blueprints : [];
			loadingStatus = 'success';
		} catch (error) {
			console.error('Failed to load blueprint instances:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function handleBlueprintClick(blueprint: BlueprintDefinition | Blueprint) {
		selectedBlueprintForDetails = blueprint;
		showBlueprintDetails = true;
		// Update URL with blueprint ID
		const id = 'blueprintdefinitionid' in blueprint ? blueprint.blueprintdefinitionid : blueprint.blueprintid;
		const basePath = activeTab === 'definitions' ? '/blueprint-definitions' : '/blueprints';
		goto(`${basePath}?id=${id}`, { replaceState: true });
	}

	function closeBlueprintDetails() {
		showBlueprintDetails = false;
		selectedBlueprintForDetails = null;
		// Clear URL parameter
		const basePath = activeTab === 'definitions' ? '/blueprint-definitions' : '/blueprints';
		goto(basePath, { replaceState: true });
	}

	function openAddBlueprintModal() {
		showAddBlueprintModal = true;
	}

	function closeAddBlueprintModal() {
		showAddBlueprintModal = false;
	}

	function handleBlueprintAdded() {
		// Refresh the data after a new blueprint definition is added
		loadData();
	}

	async function handleRemoveBlueprintDefinition(blueprintDefinition: BlueprintDefinition) {
		if (!colonyClient) {
			console.error('Colony client not initialized');
			return;
		}

		if (!blueprintDefinition.metadata.name || !blueprintDefinition.metadata.namespace) {
			alert('Cannot remove blueprint definition: missing name or namespace');
			return;
		}

		const confirmed = confirm(`Are you sure you want to remove the blueprint definition "${blueprintDefinition.metadata.name}" from colony "${blueprintDefinition.metadata.namespace}"?`);
		if (!confirmed) return;

		try {
			console.log('Removing blueprint definition:', blueprintDefinition.metadata.namespace, blueprintDefinition.metadata.name);
			await colonyClient.removeBlueprintDefinition(blueprintDefinition.metadata.namespace, blueprintDefinition.metadata.name);
			console.log('Blueprint definition removed successfully');
			// Refresh the data
			await loadData();
		} catch (error) {
			console.error('Failed to remove blueprint definition:', error);
			alert('Failed to remove blueprint definition: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async function handleRemoveBlueprint(blueprint: Blueprint) {
		if (!colonyClient) {
			console.error('Colony client not initialized');
			return;
		}

		if (!blueprint.blueprintid || !blueprint.metadata.namespace) {
			alert('Cannot remove blueprint: missing blueprint ID or namespace');
			return;
		}

		const confirmed = confirm(`Are you sure you want to remove the blueprint "${blueprint.metadata.name}" from colony "${blueprint.metadata.namespace}"?`);
		if (!confirmed) return;

		try {
			console.log('Removing blueprint:', blueprint.metadata.namespace, blueprint.blueprintid);
			await colonyClient.removeBlueprint(blueprint.metadata.namespace, blueprint.blueprintid);
			console.log('Blueprint removed successfully');
			// Refresh the data
			await loadData();
		} catch (error) {
			console.error('Failed to remove blueprint:', error);
			alert('Failed to remove blueprint: ' + (error instanceof Error ? error.message : String(error)));
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Blueprints</h1>
	</div>

	<!-- Tabs -->
	<div class="flex border-b border-gray-200 dark:border-slate-600 mb-6">
		<a
			href="/blueprints"
			data-sveltekit-preload-data={activeTab === 'blueprints' ? 'off' : 'hover'}
			class="px-6 py-3 font-medium text-sm transition-colors border-b-2 {activeTab === 'blueprints'
				? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
				: 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}"
		>
			Blueprints
		</a>
		<a
			href="/blueprint-definitions"
			data-sveltekit-preload-data={activeTab === 'definitions' ? 'off' : 'hover'}
			class="px-6 py-3 font-medium text-sm transition-colors border-b-2 {activeTab === 'definitions'
				? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
				: 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}"
		>
			Definitions
		</a>
	</div>

	<!-- Error State -->
	{#if loadingStatus === 'error'}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{/if}

	<!-- Action Buttons (always visible) -->
	<div class="flex justify-end gap-2 mb-4">
		<!-- Add Blueprint Definition Button (only on definitions tab) -->
		{#if activeTab === 'definitions'}
			<button
				onclick={openAddBlueprintModal}
				disabled={!colonyClient || loadingStatus === 'loading'}
				aria-label="Add Blueprint Definition"
				class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
				title="Add Blueprint Definition"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
		{/if}

		<!-- Refresh Button -->
		<button
			onclick={loadData}
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

	<!-- Table Content (always visible, shows skeleton when loading) -->
	{#if activeTab === 'definitions'}
		<BlueprintTable
			blueprints={allBlueprintDefinitions}
			showDefinitionColumns={true}
			onBlueprintClick={handleBlueprintClick}
			onRemoveBlueprint={handleRemoveBlueprintDefinition}
			loading={loadingStatus === 'loading'}
		/>
	{:else}
		<!-- Blueprints Tab Content -->
		<BlueprintTable
			blueprints={allBlueprints}
			showDefinitionColumns={false}
			onBlueprintClick={handleBlueprintClick}
			onRemoveBlueprint={handleRemoveBlueprint}
			loading={loadingStatus === 'loading'}
		/>
	{/if}
</div>

<!-- Blueprint Details Modal -->
<BlueprintDetailsModal
	show={showBlueprintDetails}
	blueprint={selectedBlueprintForDetails}
	client={colonyClient}
	onClose={closeBlueprintDetails}
/>

<!-- Add Blueprint Modal -->
<AddBlueprintModal
	show={showAddBlueprintModal}
	client={colonyClient}
	onClose={closeAddBlueprintModal}
	onBlueprintAdded={handleBlueprintAdded}
/>

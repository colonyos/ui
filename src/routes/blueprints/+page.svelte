<script lang="ts">
	import { onMount } from 'svelte';
	import BlueprintTable from '$lib/components/BlueprintTable.svelte';
	import BlueprintDetailsModal from '$lib/components/BlueprintDetailsModal.svelte';
	import AddBlueprintModal from '$lib/components/AddBlueprintModal.svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import type { BlueprintDefinition } from '$lib/types/blueprint';
	import ClientFactory from '$lib/utils/clientFactory';

	interface Colony {
		colonyid: string;
		name: string;
	}

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let colonies = $state<Colony[]>([]);
	let allBlueprintDefinitions = $state<BlueprintDefinition[]>([]);
	let serverClient = $state<ColonyClient | null>(null);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showBlueprintDetails = $state(false);
	let selectedBlueprintForDetails = $state<BlueprintDefinition | null>(null);
	let showAddBlueprintModal = $state(false);

	onMount(async () => {
		serverClient = await ClientFactory.getServerClient();
		colonyClient = await ClientFactory.getColonyClient();
		await loadBlueprintData();
	});

	async function loadBlueprintData() {
		if (!serverClient || !colonyClient) {
			loadingError = 'Clients not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allBlueprintDefinitions = [];

		try {
			// First get colonies
			const coloniesResult = await serverClient.getColonies();
			if (Array.isArray(coloniesResult)) {
				colonies = coloniesResult;

				// Then get blueprint definitions for each colony
				const blueprintPromises = colonies.map(async (colony) => {
					try {
						const blueprintDefinitions = await colonyClient!.getBlueprintDefinitions(colony.name);
						return Array.isArray(blueprintDefinitions) ? blueprintDefinitions : [];
					} catch (error) {
						console.warn(`Failed to get blueprint definitions for ${colony.name}:`, error);
						return [];
					}
				});

				const blueprintArrays = await Promise.all(blueprintPromises);
				allBlueprintDefinitions = blueprintArrays.flat();
				loadingStatus = 'success';
			} else {
				loadingError = 'Failed to load colonies';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load blueprint data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function handleBlueprintClick(blueprintDefinition: BlueprintDefinition) {
		selectedBlueprintForDetails = blueprintDefinition;
		showBlueprintDetails = true;
	}

	function closeBlueprintDetails() {
		showBlueprintDetails = false;
		selectedBlueprintForDetails = null;
	}

	function openAddBlueprintModal() {
		showAddBlueprintModal = true;
	}

	function closeAddBlueprintModal() {
		showAddBlueprintModal = false;
	}

	function handleBlueprintAdded() {
		// Refresh the blueprint data after a new blueprint is added
		loadBlueprintData();
	}

	async function handleRemoveBlueprint(blueprintDefinition: BlueprintDefinition) {
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
			await loadBlueprintData();
		} catch (error) {
			console.error('Failed to remove blueprint definition:', error);
			alert('Failed to remove blueprint definition: ' + (error instanceof Error ? error.message : String(error)));
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Blueprints</h1>
	</div>

	<!-- Loading/Error States -->
	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-4 text-gray-500 dark:text-slate-300">
			<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
			Loading blueprints...
		</div>
	{:else if loadingStatus === 'error'}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="flex justify-end gap-2 mb-4">
		<!-- Add Blueprint Button -->
		<button
			onclick={openAddBlueprintModal}
			disabled={!colonyClient}
			aria-label="Add Blueprint"
			class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
			title="Add Blueprint"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>

		<!-- Refresh Button -->
		<button
			onclick={loadBlueprintData}
			aria-label="Refresh"
			class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
			title="Refresh"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>
	</div>

	<BlueprintTable
		blueprints={allBlueprintDefinitions}
		onBlueprintClick={handleBlueprintClick}
		onRemoveBlueprint={handleRemoveBlueprint}
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

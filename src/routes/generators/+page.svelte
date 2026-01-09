<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import GeneratorTable from '$lib/components/GeneratorTable.svelte';
	import GeneratorDetailsModal from '$lib/components/GeneratorDetailsModal.svelte';
	import AddGeneratorModal from '$lib/components/AddGeneratorModal.svelte';
	import type { Generator } from '$lib/types/generator';
	import type { ColonyClient } from '$lib/api/colony';
	import ClientFactory from '$lib/utils/clientFactory';
	import { envConfig } from '$lib/config/env';

	interface ApiGenerator {
		generatorid: string;
		initiatorid: string;
		initiatorname: string;
		colonyname: string;
		name: string;
		workflowspec: string;
		trigger: number;
		timeout: number;
		firstpack: string;
		lastrun: string;
		queuesize: number;
		checkerperiod: number;
	}

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let allGenerators = $state<ApiGenerator[]>([]);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showGeneratorDetails = $state(false);
	let selectedGeneratorForDetails = $state<Generator | null>(null);
	let showAddGeneratorModal = $state(false);

	onMount(async () => {
		colonyClient = await ClientFactory.getColonyClient();
		await loadGeneratorData();

		// Check if there's a generator ID in the URL
		const urlGeneratorId = $page.url.searchParams.get('id');
		if (urlGeneratorId) {
			// Try to find the generator in the loaded list
			const generator = displayGenerators.find(g => g.generatorid === urlGeneratorId);
			if (generator) {
				selectedGeneratorForDetails = generator;
				showGeneratorDetails = true;
			} else {
				// Generator not in list, create a minimal object
				selectedGeneratorForDetails = { generatorid: urlGeneratorId } as Generator;
				showGeneratorDetails = true;
			}
		}
	});

	async function loadGeneratorData() {
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
		allGenerators = [];

		try {
			const generators = await colonyClient.getGenerators(colonyName, 100);
			allGenerators = Array.isArray(generators) ? generators : [];
			loadingStatus = 'success';
		} catch (error) {
			console.error('Failed to load generator data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	let displayGenerators = $derived(allGenerators as Generator[]);

	function handleGeneratorClick(generator: Generator) {
		selectedGeneratorForDetails = generator;
		showGeneratorDetails = true;
		// Update URL with generator ID
		goto(`/generators?id=${generator.generatorid}`, { replaceState: true });
	}

	function closeGeneratorDetails() {
		showGeneratorDetails = false;
		selectedGeneratorForDetails = null;
		// Clear URL parameter
		goto('/generators', { replaceState: true });
	}

	function openAddGeneratorModal() {
		showAddGeneratorModal = true;
	}

	function closeAddGeneratorModal() {
		showAddGeneratorModal = false;
	}

	async function handleGeneratorAdded() {
		await loadGeneratorData();
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Generators</h1>
	</div>

	<!-- Loading/Error States -->
	<!-- Error State -->
	{#if loadingStatus === 'error'}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{/if}

	<!-- Controls (always visible) -->
	<div class="flex justify-end gap-2 mb-4">
		<!-- Add Generator Button -->
		<button
			onclick={openAddGeneratorModal}
			disabled={loadingStatus === 'loading'}
			aria-label="Add Generator"
			class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
			title="Add Generator"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>

		<!-- Refresh Button -->
		<button
			onclick={loadGeneratorData}
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

	<!-- Table (always visible) -->
	<GeneratorTable generators={displayGenerators} onGeneratorClick={handleGeneratorClick} loading={loadingStatus === 'loading'} />
</div>

<!-- Generator Details Modal -->
<GeneratorDetailsModal
	show={showGeneratorDetails}
	generator={selectedGeneratorForDetails}
	client={colonyClient}
	onClose={closeGeneratorDetails}
/>

<!-- Add Generator Modal -->
<AddGeneratorModal
	show={showAddGeneratorModal}
	client={colonyClient}
	onClose={closeAddGeneratorModal}
	onGeneratorAdded={handleGeneratorAdded}
/>
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import CronTable from '$lib/components/CronTable.svelte';
	import CronDetailsModal from '$lib/components/CronDetailsModal.svelte';
	import AddCronModal from '$lib/components/AddCronModal.svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import type { Cron } from '$lib/types/cron';
	import ClientFactory from '$lib/utils/clientFactory';

	interface Colony {
		colonyid: string;
		name: string;
	}

	interface ApiCron {
		cronid: string;
		colonyname: string;
		name: string;
		cronexpression: string;  // API actually returns cronexpression, not cron
		initiatorid: string;     // API actually returns initiatorid
		initiatorname: string;   // API actually returns initiatorname
		interval: number;        // API returns interval
		nextrun: string;
		lastrun: string;         // API returns lastrun
		prevprocessgraphid: string; // API returns prevprocessgraphid
		checkerperiod: number;
		random: boolean;
		waitforprevprocessgraph: boolean;
		workflowspec: string;    // API returns workflowspec as string
		// API might have additional fields we don't use:
		prevkeepfiles?: number;
		prevkeepfailed?: number;
		maxexectime?: number;
		maxretries?: number;
		maxwaittime?: number;
		mem?: number;
		cores?: number;
		gpus?: number;
		conditions?: any;
		env?: any;
		fs?: any;
	}

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let colonies = $state<Colony[]>([]);
	let allCrons = $state<ApiCron[]>([]);
	let serverClient = $state<ColonyClient | null>(null);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showCronDetails = $state(false);
	let selectedCronForDetails = $state<Cron | null>(null);
	let showAddCronModal = $state(false);

	onMount(async () => {
		serverClient = await ClientFactory.getServerClient();
		colonyClient = await ClientFactory.getColonyClient();
		await loadCronData();

		// Check if there's a cron ID in the URL
		const urlCronId = $page.url.searchParams.get('id');
		if (urlCronId) {
			// Try to find the cron in the loaded list
			const cron = allCrons.find(c => c.cronid === urlCronId);
			if (cron) {
				selectedCronForDetails = cron as Cron;
				showCronDetails = true;
			} else {
				// Cron not in list, create a minimal cron object to trigger modal load
				selectedCronForDetails = { cronid: urlCronId } as Cron;
				showCronDetails = true;
			}
		}
	});

	async function loadCronData() {
		if (!serverClient || !colonyClient) {
			loadingError = 'Clients not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allCrons = [];

		try {
			const coloniesResult = await serverClient.getColonies();
			if (Array.isArray(coloniesResult)) {
				colonies = coloniesResult;
				
				const cronPromises = colonies.map(async (colony) => {
					try {
						const crons = await colonyClient!.getCrons(colony.name, 100);
						return Array.isArray(crons) ? crons : [];
					} catch (error) {
						// Silently handle "crons is nil" error - this just means no crons exist
						const errorMessage = error instanceof Error ? error.message : String(error);
						if (errorMessage.includes('crons is nil')) {
							return [];
						}
						// Log other errors as warnings
						console.warn(`Failed to get crons for ${colony.name}:`, error);
						return [];
					}
				});

				const cronArrays = await Promise.all(cronPromises);
				allCrons = cronArrays.flat();
				loadingStatus = 'success';
			} else {
				loadingError = 'Failed to load colonies';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load cron data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function convertToLegacyFormat(apiCrons: ApiCron[]): Cron[] {
		// API already returns the correct format, just cast to Cron type
		return apiCrons as Cron[];
	}

	function handleCronClick(cron: Cron) {
		selectedCronForDetails = cron;
		showCronDetails = true;
		// Update URL with cron ID
		goto(`/cron?id=${cron.cronid}`, { replaceState: true });
	}

	function closeCronDetails() {
		showCronDetails = false;
		selectedCronForDetails = null;
		// Clear URL parameter
		goto('/cron', { replaceState: true });
	}

	function openAddCronModal() {
		showAddCronModal = true;
	}

	function closeAddCronModal() {
		showAddCronModal = false;
	}

	function handleCronAdded() {
		// Refresh the cron data after a new cron is added
		loadCronData();
	}

	async function handleRunCron(cronId: string) {
		if (!colonyClient) {
			console.error('Colony client not initialized');
			return;
		}

		try {
			console.log('Running cron from table:', cronId);
			const response = await colonyClient.runCron(cronId);
			console.log('Cron triggered successfully:', response);
		} catch (error) {
			console.error('Failed to run cron:', error);
		}
	}

	let displayCrons = $derived(convertToLegacyFormat(allCrons));
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Cron Jobs</h1>
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
		<!-- Add Cron Button -->
		<button
			onclick={openAddCronModal}
			disabled={loadingStatus === 'loading' || !colonyClient}
			aria-label="Add Cron"
			class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white p-2 rounded transition-colors"
			title="Add Cron"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>

		<!-- Refresh Button -->
		<button
			onclick={loadCronData}
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
	<CronTable crons={displayCrons} onCronClick={handleCronClick} onRunCron={handleRunCron} loading={loadingStatus === 'loading'} />
</div>

<!-- Cron Details Modal -->
<CronDetailsModal
	show={showCronDetails}
	cron={selectedCronForDetails}
	client={colonyClient}
	onClose={closeCronDetails}
	onCronDeleted={loadCronData}
/>

<!-- Add Cron Modal -->
<AddCronModal
	show={showAddCronModal}
	client={colonyClient}
	onClose={closeAddCronModal}
	onCronAdded={handleCronAdded}
/>
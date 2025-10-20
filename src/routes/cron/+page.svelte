<script lang="ts">
	import { onMount } from 'svelte';
	import CronTable from '$lib/components/CronTable.svelte';
	import CronDetailsModal from '$lib/components/CronDetailsModal.svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import type { Cron } from '$lib/types/cron';
	import Crypto from '$lib/crypto/crypto.js';

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

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let loadingError = '';
	let colonies: Colony[] = [];
	let allCrons: ApiCron[] = [];
	let selectedColony = '';
	let crypto: Crypto;
	let serverClient: ColonyClient | null = null;
	let colonyClient: ColonyClient | null = null;

	// Modal state
	let showCronDetails = false;
	let selectedCronForDetails: Cron | null = null;

	onMount(async () => {
		crypto = new Crypto();
		await crypto.load();
		
		const host = $appState.host || envConfig.host;
		const port = $appState.port || envConfig.port;
		const tls = ($appState.tls || envConfig.tls) === 'true';
		
		if (host && port) {
			const endpoint = { host, port };
			
			serverClient = new ColonyClient(endpoint, crypto, tls);
			const serverPrivateKey = $appState.serverPrvKey || envConfig.serverPrvKey;
			if (serverPrivateKey) {
				serverClient.setPrivateKey(serverPrivateKey, 'server');
			}
			
			colonyClient = new ColonyClient(endpoint, crypto, tls);
			const colonyPrivateKey = $appState.colonyPrvKey || envConfig.colonyPrvKey;
			if (colonyPrivateKey) {
				colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
			}

			await loadCronData();
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
	}

	function closeCronDetails() {
		showCronDetails = false;
		selectedCronForDetails = null;
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

	$: displayCrons = convertToLegacyFormat(allCrons);

	$: filteredCrons = selectedColony 
		? displayCrons.filter(c => c.colonyname === selectedColony)
		: displayCrons;
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Cron Jobs</h1>
		<p class="mt-2 text-gray-600">
			Manage and monitor your scheduled cron jobs. View execution schedules, next run times, and
			configuration details.
		</p>
	</div>

	<!-- Loading/Error States -->
	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-4 text-gray-500">
			<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
			Loading cron data...
		</div>
	{:else if loadingStatus === 'error'}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="flex justify-end gap-4 mb-4">
		<!-- Colony Filter -->
		{#if colonies.length > 0}
			<select bind:value={selectedColony} class="text-sm border border-gray-300 rounded px-3 py-1">
				<option value="">All Colonies</option>
				{#each colonies as colony (colony.colonyid)}
					<option value={colony.name}>{colony.name}</option>
				{/each}
			</select>
		{/if}

		<!-- Refresh Button -->
		<button
			on:click={loadCronData}
			disabled={loadingStatus === 'loading'}
			class="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded transition-colors"
		>
			{loadingStatus === 'loading' ? 'Loading...' : 'Refresh'}
		</button>
	</div>

	<CronTable crons={filteredCrons} onCronClick={handleCronClick} onRunCron={handleRunCron} />
	{/if}
</div>

<!-- Cron Details Modal -->
<CronDetailsModal 
	show={showCronDetails} 
	cron={selectedCronForDetails} 
	client={colonyClient}
	onClose={closeCronDetails}
/>
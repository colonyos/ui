<script lang="ts">
	import { onMount } from 'svelte';
	import GeneratorTable from '$lib/components/GeneratorTable.svelte';
	import GeneratorDetailsModal from '$lib/components/GeneratorDetailsModal.svelte';
	import type { Generator } from '$lib/types/generator';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import Crypto from '$lib/crypto/crypto.js';

	interface Colony {
		colonyid: string;
		name: string;
	}

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

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let loadingError = '';
	let colonies: Colony[] = [];
	let allGenerators: ApiGenerator[] = [];
	let crypto: Crypto;
	let serverClient: ColonyClient | null = null;
	let colonyClient: ColonyClient | null = null;

	// Modal state
	let showGeneratorDetails = false;
	let selectedGeneratorForDetails: Generator | null = null;

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

			await loadGeneratorData();
		}
	});

	async function loadGeneratorData() {
		if (!serverClient || !colonyClient) {
			loadingError = 'Clients not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allGenerators = [];

		try {
			const coloniesResult = await serverClient.getColonies();
			if (Array.isArray(coloniesResult)) {
				colonies = coloniesResult;
				
				const generatorPromises = colonies.map(async (colony) => {
					try {
						const generators = await colonyClient!.getGenerators(colony.name, 100);
						return Array.isArray(generators) ? generators : [];
					} catch (error) {
						console.warn(`Failed to get generators for ${colony.name}:`, error);
						return [];
					}
				});

				const generatorArrays = await Promise.all(generatorPromises);
				allGenerators = generatorArrays.flat();
				loadingStatus = 'success';
			} else {
				loadingError = 'Failed to load colonies';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load generator data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function convertToLegacyFormat(apiGenerators: ApiGenerator[]): Generator[] {
		return apiGenerators.map(generator => ({
			generatorid: generator.generatorid,
			initiatorid: generator.initiatorid,
			initiatorname: generator.initiatorname,
			colonyname: generator.colonyname,
			name: generator.name,
			workflowspec: generator.workflowspec,
			trigger: generator.trigger,
			timeout: generator.timeout,
			firstpack: generator.firstpack,
			lastrun: generator.lastrun,
			queuesize: generator.queuesize,
			checkerperiod: generator.checkerperiod
		}));
	}

	$: displayGenerators = convertToLegacyFormat(allGenerators);

	function handleGeneratorClick(generator: Generator) {
		selectedGeneratorForDetails = generator;
		showGeneratorDetails = true;
	}

	function closeGeneratorDetails() {
		showGeneratorDetails = false;
		selectedGeneratorForDetails = null;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Generators</h1>
	</div>

	<!-- Loading/Error States -->
	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-4 text-gray-500">
			<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
			Loading generator data...
		</div>
	{:else if loadingStatus === 'error'}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="flex justify-end mb-4">
			<!-- Refresh Button -->
			<button
				on:click={loadGeneratorData}
				disabled={loadingStatus === 'loading'}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
				title="Refresh"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
		</div>

		<GeneratorTable generators={displayGenerators} onGeneratorClick={handleGeneratorClick} />
	{/if}
</div>

<!-- Generator Details Modal -->
<GeneratorDetailsModal 
	show={showGeneratorDetails} 
	generator={selectedGeneratorForDetails} 
	client={colonyClient}
	onClose={closeGeneratorDetails}
/>
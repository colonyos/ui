<script lang="ts">
	import { onMount } from 'svelte';
	import ExecutorTable from '$lib/components/ExecutorTable.svelte';
	import ExecutorDetailsModal from '$lib/components/ExecutorDetailsModal.svelte';
	import { sampleExecutors } from '$lib/data/sampleExecutors';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import Crypto from '$lib/crypto/crypto.js';
	import type { Executor } from '$lib/types/executor';

	interface Colony {
		colonyid: string;
		name: string;
	}

	interface ApiExecutor {
		executorid: string;
		executortype: string;
		executorname: string;
		colonyname: string;
		state: number; // 0=PENDING, 1=APPROVED, 2=REJECTED
		requirefuncreg: boolean;
		commissiontime: string;
		lastheardfromtime: string;
		location?: {
			long: number;
			lat: number;
			desc: string;
		};
		capabilities: {
			hardware: {
				model: string;
				nodes: number;
				cpu: string;
				mem: string;
				storage: string;
				gpu?: {
					name: string;
					mem: string;
					count: number;
					nodecount: number;
				};
			};
			software: {
				name: string;
				type: string;
				version: string;
			};
		};
		allocations: {
			projects: any;
		};
	}

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let loadingError = '';
	let colonies: Colony[] = [];
	let allExecutors: ApiExecutor[] = [];
	let crypto: Crypto;
	let serverClient: ColonyClient | null = null;
	let colonyClient: ColonyClient | null = null;

	// Modal state
	let showExecutorDetails = false;
	let selectedExecutorForDetails: Executor | null = null;

	onMount(async () => {
		// Initialize crypto
		crypto = new Crypto();
		await crypto.load();
		
		// Get host, port, and TLS setting from app state or environment config
		const host = $appState.host || envConfig.host;
		const port = $appState.port || envConfig.port;
		const tls = ($appState.tls || envConfig.tls) === 'true';
		
		// Initialize clients with current host/port values
		if (host && port) {
			const endpoint = { host, port };
			
			// Server client for server operations (getColonies)
			serverClient = new ColonyClient(endpoint, crypto, tls);
			const serverPrivateKey = $appState.serverPrvKey || envConfig.serverPrvKey;
			if (serverPrivateKey) {
				serverClient.setPrivateKey(serverPrivateKey, 'server');
			}
			
			// Colony client for colony operations (getExecutors) 
			colonyClient = new ColonyClient(endpoint, crypto, tls);
			const colonyPrivateKey = $appState.colonyPrvKey || envConfig.colonyPrvKey;
			if (colonyPrivateKey) {
				colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
			}

			// Auto-load data
			await loadExecutorData();
		}
	});

	async function loadExecutorData() {
		if (!serverClient || !colonyClient) {
			loadingError = 'Clients not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allExecutors = [];

		try {
			// First get colonies
			const coloniesResult = await serverClient.getColonies();
			if (Array.isArray(coloniesResult)) {
				colonies = coloniesResult;
				
				// Then get executors for each colony
				const executorPromises = colonies.map(async (colony) => {
					try {
						const executors = await colonyClient!.getExecutors(colony.name);
						return Array.isArray(executors) ? executors : [];
					} catch (error) {
						console.warn(`Failed to get executors for ${colony.name}:`, error);
						return [];
					}
				});

				const executorArrays = await Promise.all(executorPromises);
				allExecutors = executorArrays.flat();
				loadingStatus = 'success';
			} else {
				loadingError = 'Failed to load colonies';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load executor data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	// Convert API executors to the format expected by ExecutorTable
	function convertToLegacyFormat(apiExecutors: ApiExecutor[]) {
		return apiExecutors.map(executor => {
			// Find the colony ID for this executor
			const colony = colonies.find(c => c.name === executor.colonyname);
			
			return {
				executorid: executor.executorid,
				executorname: executor.executorname || 'Unnamed Executor',
				executortype: executor.executortype || 'Unknown',
				colonyid: colony?.colonyid || executor.colonyname,
				state: executor.state, // Use the correct state values: 0=PENDING, 1=APPROVED, 2=REJECTED
				lastheardfromtime: executor.lastheardfromtime,
				commissiontime: executor.commissiontime,
				location: executor.location,
				capabilities: {
					hardware: {
						model: executor.capabilities.hardware.model,
						nodes: executor.capabilities.hardware.nodes,
						cpu: executor.capabilities.hardware.cpu,
						mem: executor.capabilities.hardware.mem,
						storage: executor.capabilities.hardware.storage,
						gpu: executor.capabilities.hardware.gpu ? {
							count: executor.capabilities.hardware.gpu.count,
							name: executor.capabilities.hardware.gpu.name,
							mem: executor.capabilities.hardware.gpu.mem,
							nodecount: executor.capabilities.hardware.gpu.nodecount
						} : {
							count: 0,
							name: 'None',
							mem: '0'
						}
					},
					software: executor.capabilities.software
				},
				allocations: {
					projects: executor.allocations.projects || {} // Convert null to empty object
				}
			};
		});
	}

	function handleExecutorClick(executor: Executor) {
		// Store the colony name in the executor object for the modal
		const apiExecutor = allExecutors.find(e => e.executorid === executor.executorid);
		if (apiExecutor) {
			(executor as any).colonyname = apiExecutor.colonyname;
		}
		selectedExecutorForDetails = executor;
		showExecutorDetails = true;
	}

	function closeExecutorDetails() {
		showExecutorDetails = false;
		selectedExecutorForDetails = null;
	}

	// Use only real data, show spinner when loading
	$: displayExecutors = convertToLegacyFormat(allExecutors);

	$: filteredExecutors = displayExecutors;
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Executors</h1>
	</div>

	<!-- Loading/Error States -->
	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-4 text-gray-500">
			<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
			Loading executor data...
		</div>
	{:else if loadingStatus === 'error'}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="flex justify-end mb-4">
			<!-- Refresh Button -->
			<button
				on:click={loadExecutorData}
				disabled={loadingStatus === 'loading'}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
				title="Refresh"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
		</div>

		<ExecutorTable executors={filteredExecutors} onExecutorClick={handleExecutorClick} />
	{/if}
</div>

<!-- Executor Details Modal -->
<ExecutorDetailsModal
	show={showExecutorDetails}
	executor={selectedExecutorForDetails}
	client={colonyClient}
	onClose={closeExecutorDetails}
/>
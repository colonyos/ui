<script lang="ts">
	import { onMount } from 'svelte';
	import FunctionTable from '$lib/components/FunctionTable.svelte';
	import { sampleFunctions } from '$lib/data/sampleFunctions';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import { convertApiFunction, type ApiFunctionResponse, type Function } from '$lib/types/function';
	import Crypto from '$lib/crypto/crypto.js';

	interface Executor {
		executorid: string;
		executorname: string;
		colonyname: string;
	}

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let loadingError = '';
	let executors: Executor[] = [];
	let allFunctions: Function[] = [];
	let crypto: Crypto;
	let userClient: ColonyClient | null = null; // Client with colony private key

	onMount(async () => {
		crypto = new Crypto();
		await crypto.load();
		
		const host = $appState.host || envConfig.host;
		const port = $appState.port || envConfig.port;
		const tls = ($appState.tls || envConfig.tls) === 'true';
		
		if (host && port) {
			const endpoint = { host, port };
			
			// Colony client for getting executors and functions (using colony private key)
			userClient = new ColonyClient(endpoint, crypto, tls);
			const colonyPrivateKey = $appState.colonyPrvKey || envConfig.colonyPrvKey;
			if (colonyPrivateKey) {
				userClient.setPrivateKey(colonyPrivateKey, 'colony');
			}

			await loadFunctionData();
		}
	});

	async function loadFunctionData() {
		if (!userClient) {
			loadingError = 'Client not initialized. Check configuration.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';
		allFunctions = [];

		try {
			// Use colony name from environment variables
			const colonyName = $appState.colonyName || envConfig.colonyName;
			if (!colonyName) {
				loadingError = 'Colony name not configured in environment variables.';
				loadingStatus = 'error';
				return;
			}

			// Get executors for the specific colony using colony private key
			const colonyExecutors = await userClient.getExecutors(colonyName);
			if (Array.isArray(colonyExecutors)) {
				executors = colonyExecutors.map(e => ({
					executorid: e.executorid,
					executorname: e.executorname || e.executorid,
					colonyname: colonyName
				}));

				// Get functions for each executor
				const functionPromises = executors.map(async (executor) => {
					try {
						const functions = await userClient!.getFunctions(executor.executorname, executor.colonyname);
						if (Array.isArray(functions)) {
							return functions.map((f: ApiFunctionResponse) => convertApiFunction(f));
						}
						return [];
					} catch (error) {
						console.warn(`Failed to get functions for ${executor.executorname}:`, error);
						return [];
					}
				});

				const functionArrays = await Promise.all(functionPromises);
				allFunctions = functionArrays.flat();
				loadingStatus = 'success';
			} else {
				loadingError = 'Failed to load executors';
				loadingStatus = 'error';
			}
		} catch (error) {
			console.error('Failed to load function data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	// Only show real data, no fallback to sample data
	$: displayFunctions = allFunctions;

	// Calculate statistics
	$: totalExecutions = displayFunctions.reduce((sum, func) => sum + func.counter, 0);
	$: avgWaitTime = displayFunctions.length > 0 ? displayFunctions.reduce((sum, func) => sum + func.avgwaittime, 0) / displayFunctions.length : 0;
	$: avgExecTime = displayFunctions.length > 0 ? displayFunctions.reduce((sum, func) => sum + func.avgexectime, 0) / displayFunctions.length : 0;

	function formatDuration(seconds: number): string {
		if (seconds < 1) {
			return `${(seconds * 1000).toFixed(0)}ms`;
		} else if (seconds < 60) {
			return `${seconds.toFixed(2)}s`;
		} else if (seconds < 3600) {
			const minutes = Math.floor(seconds / 60);
			const remainingSeconds = seconds % 60;
			return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
		} else {
			const hours = Math.floor(seconds / 3600);
			const remainingMinutes = Math.floor((seconds % 3600) / 60);
			return `${hours}h ${remainingMinutes}m`;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Functions</h1>
	</div>

	<!-- Loading/Error States -->
	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-4 text-gray-500">
			<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
			Loading function data...
		</div>
	{:else if loadingStatus === 'error'}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="flex justify-end mb-4">
			<!-- Refresh Button -->
			<button
				on:click={loadFunctionData}
				disabled={loadingStatus === 'loading'}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
				title="Refresh"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
		</div>

		<FunctionTable functions={displayFunctions} />
	{/if}
</div>
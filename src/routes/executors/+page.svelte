<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ExecutorTable from '$lib/components/ExecutorTable.svelte';
	import ExecutorDetailsModal from '$lib/components/ExecutorDetailsModal.svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import type { Executor } from '$lib/types/executor';
	import { ExecutorState } from '$lib/types/executor';
	import ClientFactory from '$lib/utils/clientFactory';
	import { envConfig } from '$lib/config/env';

	interface ApiExecutor {
		executorid: string;
		executortype: string;
		executorname: string;
		colonyname: string;
		state: number; // 0=PENDING, 1=APPROVED, 2=REJECTED, 3=UNREGISTERED
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

	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let loadingError = $state('');
	let allExecutors = $state<ApiExecutor[]>([]);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showExecutorDetails = $state(false);
	let selectedExecutorForDetails = $state<Executor | null>(null);

	// Filter state
	let showUnregistered = $state(false);

	$effect(() => {
		(async () => {
			colonyClient = await ClientFactory.getColonyClient();
			await loadExecutorData();

			// Check if there's an executor ID in the URL
			const urlExecutorId = $page.url.searchParams.get('id');
			if (urlExecutorId) {
				// Try to find the executor in the loaded list
				const executor = displayExecutors.find(e => e.executorid === urlExecutorId);
				if (executor) {
					// Store colony name
					const apiExecutor = allExecutors.find(e => e.executorid === executor.executorid);
					if (apiExecutor) {
						executor.colonyname = apiExecutor.colonyname;
					}
					selectedExecutorForDetails = executor;
					showExecutorDetails = true;
				} else {
					// Executor not in list, create a minimal object
					selectedExecutorForDetails = { executorid: urlExecutorId } as Executor;
					showExecutorDetails = true;
				}
			}
		})();
	});

	async function loadExecutorData() {
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
		allExecutors = [];

		try {
			const executors = await colonyClient.getExecutors(colonyName);
			allExecutors = Array.isArray(executors) ? executors : [];
			loadingStatus = 'success';
		} catch (error) {
			console.error('Failed to load executor data:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	// Convert API executors to the format expected by ExecutorTable
	function convertToLegacyFormat(apiExecutors: ApiExecutor[]) {
		return apiExecutors.map(executor => {
			return {
				executorid: executor.executorid,
				executorname: executor.executorname || 'Unnamed Executor',
				executortype: executor.executortype || 'Unknown',
				colonyname: executor.colonyname,
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
			executor.colonyname = apiExecutor.colonyname;
		}
		selectedExecutorForDetails = executor;
		showExecutorDetails = true;
		// Update URL with executor ID
		goto(`/executors?id=${executor.executorid}`, { replaceState: true });
	}

	function closeExecutorDetails() {
		showExecutorDetails = false;
		selectedExecutorForDetails = null;
		// Clear URL parameter
		goto('/executors', { replaceState: true });
	}

	// Use only real data, show spinner when loading
	let displayExecutors = $derived(convertToLegacyFormat(allExecutors));

	let filteredExecutors = $derived(
		showUnregistered
			? displayExecutors
			: displayExecutors.filter(executor => executor.state !== ExecutorState.Unregistered)
	);
</script>

<div class="space-y-6">
	<div>
		<h1 class="page-title">Executors</h1>
	</div>

	<!-- Error State -->
	{#if loadingStatus === 'error'}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4">
			<strong>Error:</strong> {loadingError}
		</div>
	{/if}

	<!-- Controls (always visible) -->
	<div class="flex justify-between items-center mb-4">
		<!-- Filter Options -->
		<div class="flex items-center gap-2">
			<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={showUnregistered}
					disabled={loadingStatus === 'loading'}
					class="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-slate-700"
				/>
				<span>Show unregistered executors</span>
			</label>
		</div>

		<!-- Refresh Button -->
		<button
			onclick={loadExecutorData}
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
	<ExecutorTable executors={filteredExecutors} onExecutorClick={handleExecutorClick} loading={loadingStatus === 'loading'} />
</div>

<!-- Executor Details Modal -->
<ExecutorDetailsModal
	show={showExecutorDetails}
	executor={selectedExecutorForDetails}
	client={colonyClient}
	onClose={closeExecutorDetails}
/>
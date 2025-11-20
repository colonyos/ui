<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ExecutorTable from '$lib/components/ExecutorTable.svelte';
	import ExecutorDetailsModal from '$lib/components/ExecutorDetailsModal.svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import type { Executor } from '$lib/types/executor';
	import { ExecutorState } from '$lib/types/executor';
	import ClientFactory from '$lib/utils/clientFactory';

	interface Colony {
		colonyid: string;
		name: string;
	}

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
	let colonies = $state<Colony[]>([]);
	let allExecutors = $state<ApiExecutor[]>([]);
	let serverClient = $state<ColonyClient | null>(null);
	let colonyClient = $state<ColonyClient | null>(null);

	// Modal state
	let showExecutorDetails = $state(false);
	let selectedExecutorForDetails = $state<Executor | null>(null);

	// Filter state
	let showUnregistered = $state(false);

	onMount(async () => {
		serverClient = await ClientFactory.getServerClient();
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
					(executor as any).colonyname = apiExecutor.colonyname;
				}
				selectedExecutorForDetails = executor;
				showExecutorDetails = true;
			} else {
				// Executor not in list, create a minimal object
				selectedExecutorForDetails = { executorid: urlExecutorId } as Executor;
				showExecutorDetails = true;
			}
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
		<div class="flex justify-between items-center mb-4">
			<!-- Filter Options -->
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={showUnregistered}
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
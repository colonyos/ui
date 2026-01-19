<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ConnectionError from '$lib/components/ConnectionError.svelte';
	import { appState, appStateActions } from '$lib/stores/appState';
	import { themeStore } from '$lib/stores/themeStore';
	import ClientFactory from '$lib/utils/clientFactory';

	let { children } = $props();

	// Test connection to colony on mount
	async function testConnection() {
		appStateActions.setConnectionStatus('connecting');

		try {
			const client = await ClientFactory.getServerClient();

			// Test connection with a lightweight call
			await client.getStatistics();
			appStateActions.setConnectionStatus('connected');
		} catch (error) {
			console.error('Connection test failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			appStateActions.setConnectionStatus('error', errorMessage);
		}
	}

	// Initialize app state on mount
	$effect(() => {
		// Initialize theme
		themeStore.init();

		let cancelled = false;

		// Subscribe to state changes and persist them
		const unsubscribe = appState.subscribe((state) => {
			appStateActions.saveToStorage(state);
		});

		// Load config and test connection
		(async () => {
			try {
				// Load config file first, then localStorage overrides
				await appStateActions.loadFromConfig();

				// Test connection after configuration is loaded (only if not cancelled)
				if (!cancelled) {
					await testConnection();
				}
			} catch (error) {
				if (!cancelled) {
					console.error('Initialization error:', error);
				}
			}
		})();

		return () => {
			cancelled = true;
			unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>{$appState.colonyName || 'Colony Dashboard'}</title>
</svelte:head>


{#if $appState.connectionStatus === 'error'}
	<ConnectionError onRetry={testConnection} />
{:else if $appState.connectionStatus === 'connecting'}
	<div class="min-h-screen bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
			<p class="text-gray-600 dark:text-slate-300">Connecting to Colony server...</p>
		</div>
	</div>
{:else if $appState.connectionStatus === 'connected'}
	<div class="flex">
		<Sidebar />
		<main class="flex-1 ml-64 p-8 bg-white dark:bg-slate-800 min-h-screen text-gray-900 dark:text-slate-100">
			{@render children?.()}
		</main>
	</div>
{:else}
	<!-- Loading state -->
	<div class="min-h-screen bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
			<p class="text-gray-600 dark:text-slate-300">Loading...</p>
		</div>
	</div>
{/if}

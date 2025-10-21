<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ConnectionError from '$lib/components/ConnectionError.svelte';
	import { appState, appStateActions } from '$lib/stores/appState';
	import { themeStore } from '$lib/stores/themeStore';
	import { ColonyEndpoint, ColonyClient } from '$lib/api/colony';
	import Crypto from '$lib/crypto/crypto.js';

	let { children } = $props();

	// Test connection to colony on mount
	async function testConnection() {
		const currentState = $appState;
		
		if (!currentState.host || !currentState.port) {
			appStateActions.setConnectionStatus('error', 'Host and port must be configured');
			return;
		}

		appStateActions.setConnectionStatus('connecting');

		try {
			const crypto = new Crypto();
			await crypto.load();

			const endpoint = { host: currentState.host, port: currentState.port };
			const tls = currentState.tls === 'true';
			const client = new ColonyClient(endpoint, crypto, tls);

			// Set server private key if available
			const serverPrivateKey = currentState.serverPrvKey;
			if (serverPrivateKey) {
				client.setPrivateKey(serverPrivateKey, 'server');
			}

			// Try to get colonies to test connection
			await client.getColonies();
			appStateActions.setConnectionStatus('connected');
		} catch (error) {
			console.error('Connection test failed:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			appStateActions.setConnectionStatus('error', errorMessage);
		}
	}

	// Initialize app state on mount
	onMount(async () => {
		// Initialize theme
		themeStore.init();

		// Load config file first, then localStorage overrides
		await appStateActions.loadFromConfig();

		// Subscribe to state changes and persist them
		const unsubscribe = appState.subscribe((state) => {
			appStateActions.saveToStorage(state);
		});

		// Initialize default colony if none exists
		appState.update(state => {
			if (!state.colonies && !state.host) {
				return {
					...state,
					host: 'localhost',
					port: '50080',
					colonies: new ColonyEndpoint('localhost', '50080')
				};
			}
			return state;
		});

		// Test connection after configuration is loaded
		await testConnection();

		// Add global helper for testing error page (development only)
		if (typeof window !== 'undefined') {
			(window as any).testErrorPage = () => {
				appStateActions.setConnectionStatus('error', 'Manual test of connection error page');
			};
			(window as any).testConnection = testConnection;
		}

		return unsubscribe;
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

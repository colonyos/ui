<script lang="ts">
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { ColonyClient } from '$lib/api/colony';
	import Crypto from '$lib/crypto/crypto.js';

	interface ServerStatistics {
		colonies?: number;
		executors?: number;
		functions?: number;
		processes?: number;
		workflows?: number;
		waitingprocesses?: number;
		runningprocesses?: number;
		successfulprocesses?: number;
		failedprocesses?: number;
		waitingworkflows?: number;
		runningworkflows?: number;
		successfulworkflows?: number;
		failedworkflows?: number;
		uptime?: number;
		version?: string;
		[key: string]: any;
	}

	interface ServerStatus {
		status?: string;
		running?: boolean;
		starttime?: string;
		uptime?: number;
		version?: string;
		builddate?: string;
		gitcommit?: string;
		[key: string]: any;
	}

	let statistics: ServerStatistics = {};
	let serverStatus: ServerStatus = {};
	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = 'loading';
	let loadingError = '';
	let crypto: Crypto;
	let serverClient: ColonyClient | null = null;

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
		}

		await loadServerData();
	});

	async function loadServerData() {
		if (!serverClient) {
			loadingError = 'Server client not initialized. Check that host, port, and server private key are configured.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';

		try {
			// Load statistics using the working old format
			try {
				const statsResult = await serverClient.getStatistics();
				statistics = statsResult || {};
			} catch (statsError) {
				console.error('Failed to load statistics:', statsError);
				throw statsError; // Re-throw to be caught by outer catch
			}

			// Re-enable server status call
			try {
				const statusResult = await serverClient.getServerStatus();
				serverStatus = statusResult || {};
			} catch (statusError) {
				console.warn('Failed to load server status:', statusError);
			}

			loadingStatus = 'success';
		} catch (err) {
			console.error('Failed to load server data:', err);
			loadingError = err instanceof Error ? err.message : String(err);
			loadingStatus = 'error';
		}
	}

	function formatUptime(seconds: number): string {
		if (!seconds) return 'Unknown';

		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'Unknown';
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return dateString;
		}
	}
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Server</h1>
		<button
			on:click={loadServerData}
			disabled={loadingStatus === 'loading'}
			class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
		>
			{loadingStatus === 'loading' ? 'Refreshing...' : 'Refresh'}
		</button>
	</div>

	{#if loadingStatus === 'loading'}
		<div class="flex items-center justify-center py-12">
			<div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
			<span class="ml-3 text-gray-600 dark:text-gray-300">Loading server data...</span>
		</div>
	{:else if loadingStatus === 'error'}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
			<strong>Error:</strong> {loadingError}
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Server Status -->
			<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
					<div class="w-3 h-3 rounded-full mr-3 {serverStatus.running ? 'bg-green-500' : 'bg-red-500'}"></div>
					Server Status
				</h2>

				<div class="space-y-3">
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Status:</span>
						<span class="font-mono text-gray-900 dark:text-white">
							{serverStatus.status || (serverStatus.running ? 'Running' : 'Unknown')}
						</span>
					</div>

					{#if serverStatus.version}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Version:</span>
							<span class="font-mono text-gray-900 dark:text-white">{serverStatus.version}</span>
						</div>
					{/if}

					{#if serverStatus.starttime}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Started:</span>
							<span class="font-mono text-gray-900 dark:text-white">{formatDate(serverStatus.starttime)}</span>
						</div>
					{/if}

					{#if serverStatus.uptime}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Uptime:</span>
							<span class="font-mono text-gray-900 dark:text-white">{formatUptime(serverStatus.uptime)}</span>
						</div>
					{/if}

					{#if serverStatus.builddate}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Build Date:</span>
							<span class="font-mono text-gray-900 dark:text-white">{formatDate(serverStatus.builddate)}</span>
						</div>
					{/if}

					{#if serverStatus.gitcommit}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Git Commit:</span>
							<span class="font-mono text-gray-900 dark:text-white">{serverStatus.gitcommit.substring(0, 8)}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Server Statistics -->
			<div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
				<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Statistics</h2>

				<div class="space-y-3">
					{#if statistics.colonies !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Colonies:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.colonies}</span>
						</div>
					{/if}

					{#if statistics.executors !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Executors:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.executors}</span>
						</div>
					{/if}

					{#if statistics.functions !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Functions:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.functions}</span>
						</div>
					{/if}

					{#if statistics.processes !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Processes (Total):</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.processes}</span>
						</div>
					{/if}

					{#if statistics.waitingprocesses !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Waiting Processes:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.waitingprocesses}</span>
						</div>
					{/if}

					{#if statistics.runningprocesses !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Running Processes:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.runningprocesses}</span>
						</div>
					{/if}

					{#if statistics.successfulprocesses !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Successful Processes:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.successfulprocesses}</span>
						</div>
					{/if}

					{#if statistics.failedprocesses !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Failed Processes:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.failedprocesses}</span>
						</div>
					{/if}

					{#if statistics.workflows !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Workflows (Total):</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.workflows}</span>
						</div>
					{/if}

					{#if statistics.waitingworkflows !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Waiting Workflows:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.waitingworkflows}</span>
						</div>
					{/if}

					{#if statistics.runningworkflows !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Running Workflows:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.runningworkflows}</span>
						</div>
					{/if}

					{#if statistics.successfulworkflows !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Successful Workflows:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.successfulworkflows}</span>
						</div>
					{/if}

					{#if statistics.failedworkflows !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Failed Workflows:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{statistics.failedworkflows}</span>
						</div>
					{/if}

					{#if statistics.uptime !== undefined && statistics.uptime !== serverStatus.uptime}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Uptime:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{formatUptime(statistics.uptime)}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Raw Server Status Data (for debugging) -->
			{#if Object.keys(serverStatus).length > 0}
				<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 shadow-sm">
					<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Raw Server Status</h2>
					<pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-64"><code>{JSON.stringify(serverStatus, null, 2)}</code></pre>
				</div>
			{/if}

			<!-- Raw Statistics Data (for debugging) -->
			{#if Object.keys(statistics).length > 0}
				<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 shadow-sm">
					<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Raw Statistics</h2>
					<pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-64"><code>{JSON.stringify(statistics, null, 2)}</code></pre>
				</div>
			{/if}
		</div>
	{/if}
</div>
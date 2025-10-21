<script lang="ts">
	import { appState, appStateActions } from '$lib/stores/appState';

	let { onRetry }: { onRetry?: () => void } = $props();

	function handleRetry() {
		if (onRetry) {
			onRetry();
		} else {
			// Default retry behavior
			location.reload();
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-red-100">
			<svg class="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
			</svg>
		</div>
		<h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
			Connection Error
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600">
			Unable to connect to the Colony server
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
			<div class="mb-6">
				<h3 class="text-lg font-medium text-gray-900 mb-4">Connection Details</h3>
				
				<div class="space-y-3 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-500">Host:</span>
						<span class="font-mono text-gray-900">{$appState.host || 'Not configured'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500">Port:</span>
						<span class="font-mono text-gray-900">{$appState.port || 'Not configured'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-500">TLS:</span>
						<span class="font-mono text-gray-900">{$appState.tls === 'true' ? 'Enabled' : 'Disabled'}</span>
					</div>
				</div>

				{#if $appState.connectionError}
					<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
						<h4 class="text-sm font-medium text-red-800">Error Details:</h4>
						<p class="text-sm text-red-700 mt-1">{$appState.connectionError}</p>
					</div>
				{/if}
			</div>

			<div class="space-y-4">
				<button
					onclick={handleRetry}
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-colony-teal hover:bg-colony-teal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-colony-teal"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
					</svg>
					Retry Connection
				</button>
			</div>
		</div>
	</div>
</div>
<script lang="ts">
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';


	function maskPrivateKey(key: string): string {
		if (!key) return 'Not set';
		if (key.length <= 8) return key;
		return key.substring(0, 4) + '***' + key.substring(key.length - 4);
	}


</script>

<h1>Dashboard</h1>

<div class="mt-8 space-y-8">
	<!-- Environment Configuration Display -->
	<div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
		<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Environment Configuration</h2>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Colony Connection -->
			<div class="space-y-3">
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">Colony Connection</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Colony Name:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.colonyName || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Colony Private Key:</span>
						<span class="font-mono text-gray-900 dark:text-white">{maskPrivateKey(envConfig.colonyPrvKey)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Server Host:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.host}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Server Port:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.port}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">TLS Enabled:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.tls}</span>
					</div>
				</div>
			</div>

			<!-- Executor & Server -->
			<div class="space-y-3">
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">Executor & Server</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Executor ID:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.executorId || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Executor Private Key:</span>
						<span class="font-mono text-gray-900 dark:text-white">{maskPrivateKey(envConfig.executorPrvKey)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Server ID:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.serverId || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Server Private Key:</span>
						<span class="font-mono text-gray-900 dark:text-white">{maskPrivateKey(envConfig.serverPrvKey)}</span>
					</div>
				</div>
			</div>

			<!-- User Information -->
			<div class="space-y-3">
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">User Information</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Username:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.username || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">First Name:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.firstname || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Last Name:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.lastname || 'Not set'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Email:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.email || 'Not set'}</span>
					</div>
				</div>
			</div>

			<!-- App Settings -->
			<div class="space-y-3">
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200">App Settings</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Theme:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.currentTheme}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Environment:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.environment}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">App Version:</span>
						<span class="font-mono text-gray-900 dark:text-white">{envConfig.appVersion}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Current App State -->
	<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
		<h2 class="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">Current App State</h2>
		<div class="text-sm">
			<div class="flex justify-between mb-2">
				<span class="text-blue-700 dark:text-blue-300">Active Host:Port:</span>
				<span class="font-mono text-blue-900 dark:text-blue-100">{$appState.host}:{$appState.port}</span>
			</div>
			<div class="flex justify-between mb-2">
				<span class="text-blue-700 dark:text-blue-300">Active Colony:</span>
				<span class="font-mono text-blue-900 dark:text-blue-100">{$appState.colonyName || 'Not set'}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-blue-700 dark:text-blue-300">Colonies Endpoint:</span>
				<span class="font-mono text-blue-900 dark:text-blue-100">{$appState.colonies ? 'Connected' : 'Not connected'}</span>
			</div>
		</div>
	</div>
</div>

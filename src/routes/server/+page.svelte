<script lang="ts">
	import { onMount } from 'svelte';
	import type { ColonyClient } from '$lib/api/colony';
	import ClientFactory from '$lib/utils/clientFactory';
	import CryptoSingleton from '$lib/utils/cryptoSingleton';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';
	import { get } from 'svelte/store';

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

	let statistics = $state<ServerStatistics>({});
	let users = $state<any>(null);
	let loadingStatus = $state<'idle' | 'loading' | 'success' | 'error'>('loading');
	let loadingError = $state('');
	let serverClient = $state<ColonyClient | null>(null);
	let colonyClient = $state<ColonyClient | null>(null);

	// Add user modal state
	let showAddUserModal = $state(false);
	let isAddingUser = $state(false);
	let addUserError = $state('');
	let newUser = $state({
		name: '',
		userid: '',
		email: '',
		phone: ''
	});

	// Generated key pair state
	let generatedPrivateKey = $state('');
	let generatedUserId = $state('');

	// Delete user state
	let showDeleteConfirm = $state(false);
	let userToDelete = $state<any>(null);
	let isDeletingUser = $state(false);
	let deleteUserError = $state('');

	onMount(async () => {
		serverClient = await ClientFactory.getServerClient();
		colonyClient = await ClientFactory.getColonyClient();
		await loadServerData();
	});

	async function loadServerData() {
		console.log('loadServerData called');

		if (!serverClient) {
			console.error('Server client not initialized');
			loadingError = 'Server client not initialized. Check that host, port, and server private key are configured.';
			loadingStatus = 'error';
			return;
		}

		loadingStatus = 'loading';
		loadingError = '';

		try {
			// Load statistics
			console.log('Loading statistics...');
			const statsResult = await serverClient.getStatistics();
			console.log('Statistics loaded:', statsResult);
			statistics = statsResult || {};

			// Load users if colony client is available
			if (colonyClient) {
				const state = get(appState);
				const colonyName = state.colonyName || envConfig.colonyName;
				console.log('Colony name:', colonyName);

				if (colonyName) {
					try {
						console.log('Loading users...');
						users = await colonyClient.getUsers(colonyName);
						console.log('Users loaded:', users);
					} catch (usersErr) {
						console.error('Failed to load users:', usersErr);
						// Don't fail the whole page if users fail to load
						users = null;
					}
				} else {
					console.warn('No colony name configured, skipping users load');
				}
			} else {
				console.warn('Colony client not initialized, skipping users load');
			}

			console.log('Setting status to success');
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

	function openAddUserModal() {
		const state = get(appState);
		const colonyName = state.colonyName || envConfig.colonyName;

		newUser = {
			name: '',
			userid: '',
			email: '',
			phone: ''
		};
		addUserError = '';
		generatedPrivateKey = '';
		generatedUserId = '';
		showAddUserModal = true;
	}

	function closeAddUserModal() {
		showAddUserModal = false;
		addUserError = '';
		generatedPrivateKey = '';
		generatedUserId = '';
	}

	async function generateKeyPair() {
		try {
			const crypto = await CryptoSingleton.getInstance();

			// Generate private key
			const privateKey = crypto.prvkey();

			// Generate user ID from private key
			const userId = crypto.id(privateKey);

			// Store the results
			generatedPrivateKey = privateKey;
			generatedUserId = userId;

			// Auto-fill the User ID field
			newUser.userid = userId;
		} catch (err) {
			console.error('Failed to generate key pair:', err);
			addUserError = 'Failed to generate key pair: ' + (err instanceof Error ? err.message : String(err));
		}
	}

	async function handleAddUser() {
		if (!colonyClient) {
			addUserError = 'Colony client not initialized';
			return;
		}

		// Validate required fields
		if (!newUser.name.trim()) {
			addUserError = 'Name is required';
			return;
		}

		if (!newUser.userid.trim()) {
			addUserError = 'User ID is required';
			return;
		}

		isAddingUser = true;
		addUserError = '';

		try {
			const state = get(appState);
			const colonyName = state.colonyName || envConfig.colonyName;

			await colonyClient.addUser({
				colonyname: colonyName,
				userid: newUser.userid.trim(),
				name: newUser.name.trim(),
				email: newUser.email.trim(),
				phone: newUser.phone.trim()
			});

			// Success - reload users and close modal
			await loadServerData();
			closeAddUserModal();
		} catch (err) {
			console.error('Failed to add user:', err);
			addUserError = err instanceof Error ? err.message : String(err);
		} finally {
			isAddingUser = false;
		}
	}

	function confirmDeleteUser(user: any) {
		userToDelete = user;
		deleteUserError = '';
		showDeleteConfirm = true;
	}

	function cancelDeleteUser() {
		showDeleteConfirm = false;
		userToDelete = null;
		deleteUserError = '';
	}

	async function handleDeleteUser() {
		if (!colonyClient || !userToDelete) {
			return;
		}

		isDeletingUser = true;
		deleteUserError = '';

		try {
			const state = get(appState);
			const colonyName = state.colonyName || envConfig.colonyName;

			await colonyClient.removeUser(colonyName, userToDelete.name);

			// Success - reload users and close modal
			await loadServerData();
			cancelDeleteUser();
		} catch (err) {
			console.error('Failed to delete user:', err);
			deleteUserError = err instanceof Error ? err.message : String(err);
		} finally {
			isDeletingUser = false;
		}
	}
</script>

<div class="p-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="page-title">Server</h1>
		<div class="flex gap-2">
			<button
				onclick={openAddUserModal}
				aria-label="Add User"
				class="bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors"
				title="Add User"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
			<button
				onclick={loadServerData}
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
			<!-- Server Statistics -->
			<div class="bg-white dark:bg-slate-700 rounded-lg p-6 shadow-sm">
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

					{#if statistics.uptime !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Uptime:</span>
							<span class="font-mono text-gray-900 dark:text-white font-semibold">{formatUptime(statistics.uptime)}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Users Table -->
			{#if users && users.length > 0}
				<div class="bg-white dark:bg-slate-700 rounded-lg p-6 shadow-sm">
					<h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Users</h2>
					<div class="table-container">
						<table class="table-base">
							<thead class="table-header">
								<tr>
									<th class="px-4 py-3 text-left table-header-cell">Name</th>
									<th class="px-4 py-3 text-left table-header-cell">User ID</th>
									<th class="px-4 py-3 text-left table-header-cell">Email</th>
									<th class="px-4 py-3 text-left table-header-cell">Phone</th>
									<th class="px-4 py-3 text-left table-header-cell">Actions</th>
								</tr>
							</thead>
							<tbody class="table-body">
								{#each users as user}
									<tr class="table-row">
										<td class="px-4 py-3 text-gray-900 dark:text-slate-100">{user.name || '-'}</td>
										<td class="px-4 py-3 text-gray-900 dark:text-slate-100">
											<span class="font-mono text-xs">{user.userid.substring(0, 16)}...</span>
										</td>
										<td class="px-4 py-3 text-gray-600 dark:text-slate-300">{user.email || '-'}</td>
										<td class="px-4 py-3 text-gray-600 dark:text-slate-300">{user.phone || '-'}</td>
										<td class="px-4 py-3">
											<button
												onclick={() => confirmDeleteUser(user)}
												aria-label="Delete User"
												class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
												title="Delete User"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Add User Modal -->
	{#if showAddUserModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={closeAddUserModal} onkeydown={(e) => e.key === 'Escape' && closeAddUserModal()}>
			<div class="bg-white dark:bg-slate-700 rounded-lg p-6 max-w-lg w-full mx-4" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New User</h3>

				{#if addUserError}
					<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-sm">
						{addUserError}
					</div>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); handleAddUser(); }}>
					<div class="space-y-4">
						<!-- Name Field -->
						<div>
							<label for="userName" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								Name <span class="text-red-500">*</span>
							</label>
							<input
								id="userName"
								type="text"
								bind:value={newUser.name}
								disabled={isAddingUser}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700"
								placeholder="Enter user name"
								required
							/>
						</div>

						<!-- User ID Field -->
						<div>
							<label for="userId" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								User ID <span class="text-red-500">*</span>
							</label>
							<input
								id="userId"
								type="text"
								bind:value={newUser.userid}
								disabled={isAddingUser}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700"
								placeholder="Enter user ID (hash)"
								required
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Unique identifier for the user</p>
						</div>

						<!-- Email Field -->
						<div>
							<label for="userEmail" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								Email
							</label>
							<input
								id="userEmail"
								type="email"
								bind:value={newUser.email}
								disabled={isAddingUser}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700"
								placeholder="user@example.com"
							/>
						</div>

						<!-- Phone Field -->
						<div>
							<label for="userPhone" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
								Phone
							</label>
							<input
								id="userPhone"
								type="tel"
								bind:value={newUser.phone}
								disabled={isAddingUser}
								class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700"
								placeholder="+1234567890"
							/>
						</div>

						<!-- Generate Key Pair Button -->
						<div class="pt-2 border-t border-gray-200 dark:border-slate-600">
							<button
								type="button"
								onclick={generateKeyPair}
								disabled={isAddingUser}
								class="w-full px-4 py-2 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded transition-colors"
							>
								Generate Key Pair
							</button>
							<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Generate a new private key and user ID</p>
						</div>
					</div>

					<!-- Generated Keys Display -->
					{#if generatedPrivateKey && generatedUserId}
						<div class="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
							<h4 class="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Generated Credentials</h4>

							<div class="space-y-3">
								<!-- User ID -->
								<div>
									<div class="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
										User ID (auto-filled above)
									</div>
									<div class="bg-white dark:bg-slate-800 rounded p-2 border border-purple-200 dark:border-purple-700">
										<code class="text-xs text-purple-900 dark:text-purple-200 break-all font-mono">{generatedUserId}</code>
									</div>
								</div>

								<!-- Private Key -->
								<div>
									<div class="block text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
										Private Key (save this securely!)
									</div>
									<div class="bg-white dark:bg-slate-800 rounded p-2 border border-purple-200 dark:border-purple-700">
										<code class="text-xs text-purple-900 dark:text-purple-200 break-all font-mono">{generatedPrivateKey}</code>
									</div>
									<p class="mt-1 text-xs text-purple-600 dark:text-purple-400">⚠️ Save this private key - it cannot be recovered!</p>
								</div>
							</div>
						</div>
					{/if}

					<div class="flex justify-end gap-3 mt-6">
						<button
							type="button"
							onclick={closeAddUserModal}
							disabled={isAddingUser}
							class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 rounded transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isAddingUser}
							class="px-4 py-2 text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded transition-colors"
						>
							{isAddingUser ? 'Adding...' : 'Add User'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Delete User Confirmation Modal -->
	{#if showDeleteConfirm && userToDelete}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={cancelDeleteUser} onkeydown={(e) => e.key === 'Escape' && cancelDeleteUser()}>
			<div class="bg-white dark:bg-slate-700 rounded-lg p-6 max-w-md w-full mx-4" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm User Deletion</h3>

				{#if deleteUserError}
					<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-sm">
						{deleteUserError}
					</div>
				{/if}

				<p class="text-gray-600 dark:text-slate-300 mb-4">
					Are you sure you want to delete this user?
				</p>
				<div class="bg-gray-50 dark:bg-slate-600 rounded p-3 mb-4">
					<p class="text-xs text-gray-500 dark:text-slate-400 mb-1">Username:</p>
					<p class="font-semibold text-gray-900 dark:text-white">{userToDelete.name}</p>
					{#if userToDelete.email}
						<p class="text-xs text-gray-500 dark:text-slate-400 mt-2 mb-1">Email:</p>
						<p class="text-sm text-gray-900 dark:text-white">{userToDelete.email}</p>
					{/if}
				</div>
				<p class="text-sm text-gray-600 dark:text-slate-300 mb-6">
					This action cannot be undone.
				</p>
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={cancelDeleteUser}
						disabled={isDeletingUser}
						class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 rounded transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleDeleteUser}
						disabled={isDeletingUser}
						class="px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded transition-colors"
					>
						{isDeletingUser ? 'Deleting...' : 'Delete User'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
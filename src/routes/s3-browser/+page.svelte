<script lang="ts">
	import { onMount } from 'svelte';
	import { s3Client, type S3Object } from '$lib/api/s3';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let objects = $state<S3Object[]>([]);
	let folders = $state<string[]>([]);
	let currentPrefix = $state('');
	let breadcrumbs = $state<string[]>([]);
	let isConfigured = $state(false);
	let bucketName = $state('');

	onMount(() => {
		isConfigured = s3Client.isConfigured();
		bucketName = s3Client.getBucketName();
		if (isConfigured) {
			loadObjects();
		}
	});

	async function loadObjects() {
		loading = true;
		error = null;

		try {
			const result = await s3Client.listObjects(currentPrefix);
			objects = result.objects;
			folders = result.prefixes;
		} catch (err) {
			console.error('Failed to load S3 objects:', err);
			error = err instanceof Error ? err.message : 'Failed to load S3 objects';
		} finally {
			loading = false;
		}
	}

	function navigateToFolder(prefix: string) {
		currentPrefix = prefix;
		updateBreadcrumbs();
		loadObjects();
	}

	function navigateUp() {
		if (!currentPrefix) return;

		const parts = currentPrefix.split('/').filter(p => p);
		parts.pop();
		currentPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
		updateBreadcrumbs();
		loadObjects();
	}

	function navigateToBreadcrumb(index: number) {
		if (index === 0) {
			currentPrefix = '';
		} else {
			const parts = breadcrumbs.slice(1, index + 1);
			currentPrefix = parts.join('/') + '/';
		}
		updateBreadcrumbs();
		loadObjects();
	}

	function updateBreadcrumbs() {
		if (!currentPrefix) {
			breadcrumbs = ['🏠 Root'];
		} else {
			const parts = currentPrefix.split('/').filter(p => p);
			breadcrumbs = ['🏠 Root', ...parts];
		}
	}

	async function downloadFile(key: string, name: string) {
		try {
			const url = await s3Client.getDownloadUrl(key);
			const link = document.createElement('a');
			link.href = url;
			link.download = name;
			link.click();
		} catch (err) {
			console.error('Failed to download file:', err);
			alert('Failed to download file: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}

	function formatSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleString();
	}

	function getFileName(key: string): string {
		const parts = key.split('/');
		return parts[parts.length - 1] || key;
	}

	function getFolderName(prefix: string): string {
		const parts = prefix.split('/').filter(p => p);
		return parts[parts.length - 1] || prefix;
	}

	$effect(() => {
		updateBreadcrumbs();
	});
</script>

<svelte:head>
	<title>S3 Browser - Colony Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="page-title">S3 Browser</h1>
			{#if isConfigured && bucketName}
				<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
					Bucket: <span class="font-mono">{bucketName}</span>
				</p>
			{/if}
		</div>
		<button
			onclick={loadObjects}
			disabled={loading || !isConfigured}
			aria-label="Refresh"
			class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
			title="Refresh"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>
	</div>

	{#if !isConfigured}
		<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
			<div class="flex items-start gap-3">
				<div class="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
				<div>
					<h3 class="font-semibold text-yellow-900 dark:text-yellow-100">S3 Not Configured</h3>
					<p class="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
						Please configure S3 settings in your <code class="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">.env</code> file:
					</p>
					<ul class="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 ml-4">
						<li>• VITE_AWS_S3_ENDPOINT</li>
						<li>• VITE_AWS_S3_ACCESSKEY</li>
						<li>• VITE_AWS_S3_SECRETKEY</li>
						<li>• VITE_AWS_S3_BUCKET</li>
					</ul>
				</div>
			</div>
		</div>
	{:else}

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<div class="flex items-start gap-3">
				<div class="text-red-600 dark:text-red-400 text-xl">❌</div>
				<div>
					<h3 class="font-semibold text-red-900 dark:text-red-100">Error Loading S3 Objects</h3>
					<p class="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Breadcrumb Navigation -->
	<div class="bg-white dark:bg-slate-700 rounded-lg shadow p-4">
		<div class="flex items-center gap-2 text-sm">
			{#each breadcrumbs as crumb, index}
				{#if index > 0}
					<span class="text-gray-400 dark:text-slate-500">/</span>
				{/if}
				<button
					onclick={() => navigateToBreadcrumb(index)}
					class="text-blue-600 dark:text-blue-400 hover:underline"
				>
					{crumb}
				</button>
			{/each}
		</div>
	</div>

	<!-- File/Folder List -->
	<div class="bg-white dark:bg-slate-700 rounded-lg shadow overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="bg-gray-50 dark:bg-slate-600">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider w-12">
							Type
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider">
							Name
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider w-32">
							Size
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider w-48">
							Last Modified
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase tracking-wider w-32">
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-slate-600">
					<!-- Up Navigation -->
					{#if currentPrefix}
						<tr class="hover:bg-gray-50 dark:hover:bg-slate-600">
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-2xl">⬆️</span>
							</td>
							<td colspan="3" class="px-6 py-4">
								<button
									onclick={navigateUp}
									class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
								>
									.. (Parent Directory)
								</button>
							</td>
							<td></td>
						</tr>
					{/if}

					<!-- Folders -->
					{#each folders as folder}
						<tr class="hover:bg-gray-50 dark:hover:bg-slate-600 cursor-pointer" onclick={() => navigateToFolder(folder)}>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-2xl">📁</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-gray-900 dark:text-white font-medium">{getFolderName(folder)}</span>
							</td>
							<td class="px-6 py-4 text-gray-500 dark:text-slate-300">—</td>
							<td class="px-6 py-4 text-gray-500 dark:text-slate-300">—</td>
							<td class="px-6 py-4"></td>
						</tr>
					{/each}

					<!-- Files -->
					{#each objects as obj}
						<tr class="hover:bg-gray-50 dark:hover:bg-slate-600">
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="text-2xl">📄</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-gray-900 dark:text-white">{getFileName(obj.key)}</span>
							</td>
							<td class="px-6 py-4 text-gray-500 dark:text-slate-300">
								{formatSize(obj.size)}
							</td>
							<td class="px-6 py-4 text-gray-500 dark:text-slate-300">
								{formatDate(obj.lastModified)}
							</td>
							<td class="px-6 py-4">
								<button
									onclick={() => downloadFile(obj.key, getFileName(obj.key))}
									class="text-blue-600 dark:text-blue-400 hover:underline text-sm"
								>
									Download
								</button>
							</td>
						</tr>
					{/each}

					{#if !loading && folders.length === 0 && objects.length === 0}
						<tr>
							<td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-slate-300">
								This folder is empty
							</td>
						</tr>
					{/if}

					{#if loading}
						<tr>
							<td colspan="5" class="px-6 py-12 text-center text-gray-500 dark:text-slate-300">
								<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								<p class="mt-2">Loading...</p>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	{/if}
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ClientFactory from '$lib/utils/clientFactory';
	import FileDetailsModal from '$lib/components/FileDetailsModal.svelte';
	import { envConfig } from '$lib/config/env';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let labels = $state<any[]>([]);
	let files = $state<any[]>([]);
	let selectedLabel = $state<{ name: string; colonyname: string } | null>(null);
	let selectedFile = $state<any | null>(null);

	onMount(async () => {
		// Check if URL contains a label query parameter
		const labelParam = $page.url.searchParams.get('label');
		if (labelParam) {
			// URL is /filesystem?label=<label>, extract label
			// Load labels first to find the colony name
			await loadFileLabels();
			const label = labels.find(l => l.name === labelParam);
			if (label) {
				await loadFilesInternal(label.name, label.colonyname);
			} else {
				// Label not found, go back to filesystem root
				goto('/filesystem', { replaceState: true });
			}
		} else {
			await loadFileLabels();
		}
	});

	async function loadFileLabels() {
		loading = true;
		error = null;

		try {
			const client = await ClientFactory.getColonyClient();
			const colonyName = envConfig.colonyName;

			if (!colonyName) {
				throw new Error('Colony name not configured. Check environment variables.');
			}

			const result = await client.getFileLabels(colonyName, '', false);
			if (result && Array.isArray(result)) {
				labels = result.map((label: any) => ({
					...label,
					colonyname: colonyName
				}));
			} else {
				labels = [];
			}
		} catch (err) {
			console.error('Failed to load file labels:', err);
			error = err instanceof Error ? err.message : 'Failed to load file labels';
		} finally {
			loading = false;
		}
	}

	async function loadFilesInternal(label: string, colonyname: string) {
		loading = true;
		error = null;
		selectedLabel = { name: label, colonyname };

		try {
			const client = await ClientFactory.getColonyClient();
			const result = await client.getFiles(colonyname, label);

			if (result && Array.isArray(result)) {
				// Fetch detailed information for each file
				const detailedFiles: any[] = [];
				for (const file of result) {
					try {
						const fileDetails = await client.getFile(colonyname, {
							name: file.name,
							label: label,
							latest: false
						});
						// getFile returns an array with a single file object
						if (fileDetails && Array.isArray(fileDetails) && fileDetails.length > 0) {
							detailedFiles.push(fileDetails[0]);
						}
					} catch (fileErr) {
						console.error(`Failed to get details for file ${file.name}:`, fileErr);
					}
				}
				files = detailedFiles;
			} else {
				files = [];
			}
		} catch (err) {
			console.error(`Failed to load files for label ${label}:`, err);
			error = err instanceof Error ? err.message : 'Failed to load files';
			files = [];
		} finally {
			loading = false;
		}
	}

	async function loadFiles(label: string, colonyname: string) {
		// Navigate to /filesystem?label=<label>
		await goto(`/filesystem?label=${encodeURIComponent(label)}`);
		await loadFilesInternal(label, colonyname);
	}

	function backToLabels() {
		selectedLabel = null;
		files = [];
		error = null;
		goto('/filesystem');
	}

	function formatSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString();
	}

	function truncateFileId(fileId: string): string {
		if (!fileId) return 'N/A';
		if (fileId.length <= 16) return fileId;
		return fileId.substring(0, 8) + '...' + fileId.substring(fileId.length - 8);
	}

	function openFileDetails(file: any) {
		selectedFile = file;
	}

	function closeFileDetails() {
		selectedFile = null;
	}
</script>

<svelte:head>
	<title>File Browser - Colony Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			{#if selectedLabel}
				<button
					onclick={backToLabels}
					class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
					aria-label="Back to labels"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</button>
			{/if}
			<div>
				<h1 class="page-title">File Browser</h1>
				{#if selectedLabel}
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
						Label: <span class="font-mono">{selectedLabel.name}</span> • Colony: <span class="font-mono">{selectedLabel.colonyname}</span>
					</p>
				{/if}
			</div>
		</div>
		<button
			onclick={selectedLabel ? () => loadFilesInternal(selectedLabel.name, selectedLabel.colonyname) : loadFileLabels}
			disabled={loading}
			aria-label="Refresh"
			class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
			title="Refresh"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<div class="flex items-start gap-3">
				<div class="text-red-600 dark:text-red-400 text-xl">❌</div>
				<div>
					<h3 class="font-semibold text-red-900 dark:text-red-100">Error Loading {selectedLabel ? 'Files' : 'File Labels'}</h3>
					<p class="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if !selectedLabel}
		<!-- File Labels Table -->
		<div class="table-container">
			<div class="overflow-x-auto">
				<table class="table-base">
					<thead class="table-header">
						<tr>
							<th class="table-header-cell">Label</th>
							<th class="table-header-cell">Colony</th>
							<th class="table-header-cell">Files</th>
						</tr>
					</thead>
					<tbody class="table-body">
						{#if loading}
							<tr>
								<td colspan="3" class="px-6 py-12 text-center text-gray-500 dark:text-slate-300">
									<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
									<p class="mt-2">Loading file labels...</p>
								</td>
							</tr>
						{:else if labels.length === 0}
							<tr>
								<td colspan="3" class="table-empty">
									No file labels found
								</td>
							</tr>
						{:else}
							{#each labels as label}
								<tr class="table-row cursor-pointer" onclick={() => loadFiles(label.name, label.colonyname)}>
									<td class="px-6 py-4 text-gray-900 dark:text-white font-medium">
										{label.name || 'N/A'}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-slate-100">
										{label.colonyname || 'N/A'}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-slate-100">
										{label.files || 0}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Files Table -->
		<div class="table-container">
			<div class="overflow-x-auto">
				<table class="table-base">
					<thead class="table-header">
						<tr>
							<th class="table-header-cell">File Name</th>
							<th class="table-header-cell">Size</th>
							<th class="table-header-cell">Added</th>
							<th class="table-header-cell">File ID</th>
						</tr>
					</thead>
					<tbody class="table-body">
						{#if loading}
							<tr>
								<td colspan="4" class="px-6 py-12 text-center text-gray-500 dark:text-slate-300">
									<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
									<p class="mt-2">Loading files...</p>
								</td>
							</tr>
						{:else if files.length === 0}
							<tr>
								<td colspan="4" class="table-empty">
									No files found for this label
								</td>
							</tr>
						{:else}
							{#each files as file}
								<tr class="table-row cursor-pointer" onclick={() => openFileDetails(file)}>
									<td class="px-6 py-4 text-gray-900 dark:text-white font-medium">
										{file.name || 'N/A'}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-slate-100">
										{file.size ? formatSize(file.size) : 'N/A'}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-slate-100">
										{formatDate(file.added)}
									</td>
									<td class="px-6 py-4 text-gray-500 dark:text-slate-400 font-mono text-xs" title={file.fileid}>
										{truncateFileId(file.fileid)}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- File Details Modal -->
{#if selectedFile}
	<FileDetailsModal file={selectedFile} onClose={closeFileDetails} />
{/if}

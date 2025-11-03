<script lang="ts">
	import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

	interface Props {
		file: any;
		onClose: () => void;
	}

	let { file, onClose }: Props = $props();
	let downloading = $state(false);
	let downloadError = $state<string | null>(null);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
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

	async function downloadFile() {
		if (!file.ref || !file.ref.s3object) {
			downloadError = 'No storage reference available for this file';
			return;
		}

		downloading = true;
		downloadError = null;

		try {
			const s3obj = file.ref.s3object;

			// Build endpoint URL
			const protocol = s3obj.tls ? 'https' : 'http';
			const port = s3obj.port !== -1 ? `:${s3obj.port}` : '';
			const endpoint = `${protocol}://${s3obj.server}${port}`;

			// Create S3 client with file's credentials
			const client = new S3Client({
				region: s3obj.region || 'us-east-1',
				credentials: {
					accessKeyId: s3obj.accesskey,
					secretAccessKey: s3obj.secretkey
				},
				endpoint: endpoint,
				forcePathStyle: true
			});

			// Download the file
			const command = new GetObjectCommand({
				Bucket: s3obj.bucket,
				Key: s3obj.object
			});

			const response = await client.send(command);

			if (!response.Body) {
				throw new Error('No body in response');
			}

			// Convert the stream to a blob
			const stream = response.Body as ReadableStream;
			const reader = stream.getReader();
			const chunks: Uint8Array[] = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
			}

			const blob = new Blob(chunks, { type: response.ContentType });

			// Trigger download
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

		} catch (err) {
			console.error('Failed to download file:', err);
			downloadError = err instanceof Error ? err.message : 'Failed to download file';
		} finally {
			downloading = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
	onclick={handleBackdropClick}
	role="button"
	tabindex="0"
>
	<div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
		<!-- Header -->
		<div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">File Details</h2>
			<button
				onclick={onClose}
				class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
				aria-label="Close"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="px-6 py-4 space-y-6">
			<!-- Download Error -->
			{#if downloadError}
				<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<div class="text-red-600 dark:text-red-400 text-xl">❌</div>
						<div>
							<h3 class="font-semibold text-red-900 dark:text-red-100">Download Failed</h3>
							<p class="text-sm text-red-700 dark:text-red-300 mt-1">{downloadError}</p>
						</div>
					</div>
				</div>
			{/if}
			<!-- Basic Information -->
			<div>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">File Name</p>
						<p class="text-gray-900 dark:text-white font-medium break-all">{file.name || 'N/A'}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">Size</p>
						<p class="text-gray-900 dark:text-white font-medium">{formatSize(file.size || 0)}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">Added</p>
						<p class="text-gray-900 dark:text-white font-medium">{formatDate(file.added)}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">Sequence Number</p>
						<p class="text-gray-900 dark:text-white font-medium">{file.sequencenr ?? 'N/A'}</p>
					</div>
					<div class="col-span-2">
						<p class="text-sm text-gray-500 dark:text-slate-400">Label</p>
						<p class="text-gray-900 dark:text-white font-medium font-mono">{file.label || 'N/A'}</p>
					</div>
					<div class="col-span-2">
						<p class="text-sm text-gray-500 dark:text-slate-400">Colony</p>
						<p class="text-gray-900 dark:text-white font-medium font-mono">{file.colonyname || 'N/A'}</p>
					</div>
				</div>
			</div>

			<!-- File ID -->
			<div>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">File ID</h3>
				<p class="text-gray-900 dark:text-white font-mono text-sm break-all bg-gray-50 dark:bg-slate-700 p-3 rounded">
					{file.fileid || 'N/A'}
				</p>
			</div>

			<!-- Checksum -->
			<div>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Checksum</h3>
				<div class="space-y-2">
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">Algorithm</p>
						<p class="text-gray-900 dark:text-white font-medium">{file.checksumalg || 'N/A'}</p>
					</div>
					<div>
						<p class="text-sm text-gray-500 dark:text-slate-400">Hash</p>
						<p class="text-gray-900 dark:text-white font-mono text-sm break-all bg-gray-50 dark:bg-slate-700 p-3 rounded">
							{file.checksum || 'N/A'}
						</p>
					</div>
				</div>
			</div>

			<!-- Storage Reference -->
			{#if file.ref && file.ref.s3object}
				<div>
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Storage Reference</h3>
					<div class="space-y-3">
						<div>
							<p class="text-sm text-gray-500 dark:text-slate-400">Protocol</p>
							<p class="text-gray-900 dark:text-white font-medium">{file.ref.protocol?.toUpperCase() || 'N/A'}</p>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-gray-500 dark:text-slate-400">Server</p>
								<p class="text-gray-900 dark:text-white font-medium font-mono text-sm break-all">{file.ref.s3object.server || 'N/A'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-slate-400">Port</p>
								<p class="text-gray-900 dark:text-white font-medium">{file.ref.s3object.port !== -1 ? file.ref.s3object.port : 'Default'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-slate-400">TLS</p>
								<p class="text-gray-900 dark:text-white font-medium">{file.ref.s3object.tls ? 'Enabled' : 'Disabled'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500 dark:text-slate-400">Region</p>
								<p class="text-gray-900 dark:text-white font-medium">{file.ref.s3object.region || 'N/A'}</p>
							</div>
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-slate-400">Bucket</p>
							<p class="text-gray-900 dark:text-white font-medium font-mono">{file.ref.s3object.bucket || 'N/A'}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500 dark:text-slate-400">Object</p>
							<p class="text-gray-900 dark:text-white font-mono text-sm break-all bg-gray-50 dark:bg-slate-700 p-3 rounded">
								{file.ref.s3object.object || 'N/A'}
							</p>
						</div>
						{#if file.ref.s3object.encryptionalg}
							<div>
								<p class="text-sm text-gray-500 dark:text-slate-400">Encryption Algorithm</p>
								<p class="text-gray-900 dark:text-white font-medium">{file.ref.s3object.encryptionalg}</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
			<button
				onclick={downloadFile}
				disabled={downloading || !file.ref || !file.ref.s3object}
				class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded transition-colors flex items-center gap-2"
			>
				{#if downloading}
					<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Downloading...
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Download File
				{/if}
			</button>
			<button
				onclick={onClose}
				class="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
			>
				Close
			</button>
		</div>
	</div>
</div>

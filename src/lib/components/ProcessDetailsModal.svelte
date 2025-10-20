<script lang="ts">
	import type { Process } from '$lib/types/process';
	import { ColonyClient } from '$lib/api/colony';
	import { getProcessStateLabel, getProcessStateColor } from '$lib/types/process';

	interface Props {
		show: boolean;
		process: Process | null;
		client: ColonyClient | null;
		onClose: () => void;
		onProcessDeleted?: () => void;
	}

	let { show, process, client, onClose, onProcessDeleted }: Props = $props();

	let loadingDetails = $state(false);
	let detailsError = $state('');
	let processDetails: any = $state(null);
	let deletingStatus: 'idle' | 'deleting' | 'success' | 'error' = $state('idle');
	let deleteError = $state('');
	let showDeleteConfirm = $state(false);

	async function loadProcessDetails() {
		if (!process || !client) {
			detailsError = 'Process or client not available';
			return;
		}

		loadingDetails = true;
		detailsError = '';
		processDetails = null;

		try {
			console.log('=== Fetching process details ===');
			console.log('Process ID:', process.processid);
			console.log('Using processid from process object:', process.processid);

			// Note: getProcess should use general private key, not colony-specific
			// The client should be configured with the appropriate key
			processDetails = await client.getProcess(process.processid);

			console.log('=== getProcess Response ===');
			console.log('Full response:', JSON.stringify(processDetails, null, 2));
			console.log('Response type:', typeof processDetails);
			console.log('Response keys:', Object.keys(processDetails || {}));

		} catch (error) {
			console.error('Failed to load process details:', error);
			detailsError = error instanceof Error ? error.message : String(error);
		} finally {
			loadingDetails = false;
		}
	}

	// Load details when modal shows
	$effect(() => {
		if (show && process) {
			loadProcessDetails();
		}
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	let deleteTimeoutId: ReturnType<typeof setTimeout> | null = $state(null);

	async function deleteProcess() {
		if (!process || !client) {
			deleteError = 'Process or client not available';
			deletingStatus = 'error';
			return;
		}

		deletingStatus = 'deleting';
		deleteError = '';

		try {
			await client.removeProcess(process.processid);
			deletingStatus = 'success';

			// Close modal and notify parent after a short delay
			deleteTimeoutId = setTimeout(() => {
				onProcessDeleted?.();
				onClose();
				deletingStatus = 'idle';
				showDeleteConfirm = false;
				deleteTimeoutId = null;
			}, 1500);
		} catch (error) {
			console.error('Failed to delete process:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);

			// Provide more specific error messages for common failure cases
			if (errorMessage.toLowerCase().includes('workflow') || errorMessage.toLowerCase().includes('graph')) {
				deleteError = 'Cannot delete process: This process is part of a workflow. Use workflow management tools to remove the entire workflow instead.';
			} else if (errorMessage.toLowerCase().includes('parent') || errorMessage.toLowerCase().includes('child') || errorMessage.toLowerCase().includes('depend')) {
				deleteError = 'Cannot delete process: This process has dependencies (parent or child processes). Remove dependencies first.';
			} else if (errorMessage.toLowerCase().includes('not found')) {
				deleteError = 'Process not found: It may have already been deleted or completed.';
			} else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('unauthorized')) {
				deleteError = 'Permission denied: You do not have sufficient privileges to delete this process.';
			} else {
				deleteError = `Failed to delete process: ${errorMessage}`;
			}

			deletingStatus = 'error';
		}
	}

	// Cleanup timeout on component destroy or modal close
	$effect(() => {
		return () => {
			if (deleteTimeoutId) {
				clearTimeout(deleteTimeoutId);
				deleteTimeoutId = null;
			}
		};
	});

	function confirmDelete() {
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		deleteError = '';
		deletingStatus = 'idle';
	}

	function isPartOfWorkflow(): boolean {
		return !!(process?.processgraphid && process.processgraphid !== '');
	}

	function hasParentsOrChildren(): boolean {
		return !!(
			(process?.parents && process.parents.length > 0) ||
			(process?.children && process.children.length > 0)
		);
	}

	function canDeleteProcess(): boolean {
		// Can't delete if it's part of a workflow or has dependencies
		return !isPartOfWorkflow() && !hasParentsOrChildren();
	}

	function getDeleteDisabledReason(): string {
		if (isPartOfWorkflow()) {
			return 'Cannot delete processes that are part of a workflow';
		}
		if (hasParentsOrChildren()) {
			return 'Cannot delete processes with parent or child dependencies';
		}
		return '';
	}

	function formatDate(dateString: string): string {
		if (!dateString || dateString === '0001-01-01T00:00:00Z' || dateString === '0001-01-01T00:53:28+00:53') {
			return 'Not set';
		}
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return 'Invalid date';
		}
	}

	function formatDuration(startTime: string, endTime: string): string {
		if (!startTime || startTime === '0001-01-01T00:00:00Z') {
			return 'Not started';
		}

		const start = new Date(startTime);
		let end: Date;

		if (!endTime || endTime === '0001-01-01T00:00:00Z') {
			end = new Date(); // Still running
		} else {
			end = new Date(endTime);
		}

		const diffMs = end.getTime() - start.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		const diffMin = Math.floor(diffSec / 60);
		const diffHour = Math.floor(diffMin / 60);

		if (diffHour > 0) {
			return `${diffHour}h ${diffMin % 60}m ${diffSec % 60}s`;
		} else if (diffMin > 0) {
			return `${diffMin}m ${diffSec % 60}s`;
		} else {
			return `${diffSec}s`;
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-semibold text-gray-900">Process Details</h3>
						{#if process}
							<p class="text-sm text-gray-600 mt-1">{process.spec?.funcname || 'Unknown Function'}</p>
							<p class="text-xs text-gray-400 font-mono">{process.processid}</p>
						{/if}
					</div>
					<button
						onclick={onClose}
						aria-label="Close modal"
						class="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
				{#if !process}
					<p class="text-gray-500">No process selected</p>
				{:else}
					<!-- Process Summary -->
					<div class="mb-6">
						<h4 class="text-md font-medium text-gray-900 mb-3">Process Summary</h4>
						<div class="bg-gray-50 rounded-lg p-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<span class="text-sm text-gray-600">Status:</span>
									<span class="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full {getProcessStateColor(process.state)}">
										{getProcessStateLabel(process.state)}
									</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">Function:</span>
									<span class="ml-2 text-sm font-medium text-gray-900">{process.spec?.funcname || 'Unknown'}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">Initiator:</span>
									<span class="ml-2 text-sm font-medium text-gray-900">{process.initiatorname || 'Unknown'}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">Assigned:</span>
									<span class="ml-2 text-sm text-gray-900">{process.isassigned ? 'Yes' : 'No'}</span>
								</div>
								{#if process.processgraphid}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600">Workflow:</span>
										<span class="ml-2 text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">{process.processgraphid}</span>
										<span class="ml-2 text-xs text-orange-600">⚠️ Part of workflow</span>
									</div>
								{/if}
								<div>
									<span class="text-sm text-gray-600">Retries:</span>
									<span class="ml-2 text-sm text-gray-900">{process.retries}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">Start Time:</span>
									<span class="ml-2 text-sm text-gray-900">{formatDate(process.starttime)}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">End Time:</span>
									<span class="ml-2 text-sm text-gray-900">{formatDate(process.endtime)}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600">Duration:</span>
									<span class="ml-2 text-sm text-gray-900">{formatDuration(process.starttime, process.endtime)}</span>
								</div>
								{#if process.spec?.args && process.spec.args.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600">Arguments:</span>
										<span class="ml-2 text-sm text-gray-900 font-mono">[{process.spec.args.join(', ')}]</span>
									</div>
								{/if}
								{#if process.errors && process.errors.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600">Errors:</span>
										<div class="ml-2 mt-1">
											{#each process.errors as error}
												<div class="text-sm text-red-600 bg-red-50 px-2 py-1 rounded mb-1">{error}</div>
											{/each}
										</div>
									</div>
								{/if}
								{#if process.children && process.children.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600">Children ({process.children.length}):</span>
										<div class="ml-2 text-xs text-gray-500 font-mono break-all">
											{process.children.join(', ')}
										</div>
									</div>
								{/if}
								{#if process.parents && process.parents.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600">Parents ({process.parents.length}):</span>
										<div class="ml-2 text-xs text-gray-500 font-mono break-all">
											{process.parents.join(', ')}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Detailed Information -->
					{#if loadingDetails}
						<div class="flex items-center justify-center py-8 text-gray-500">
							<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
							Loading process details...
						</div>
					{:else if detailsError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
							<strong>Error:</strong> {detailsError}
						</div>
					{:else if processDetails}
						<!-- Timing Information -->
						<div class="mb-6">
							<h4 class="text-md font-medium text-gray-900 mb-3">Timing & Scheduling</h4>
							<div class="bg-blue-50 rounded-lg p-4">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-blue-700">Submission Time:</span>
										<span class="text-blue-900 ml-2">{formatDate(processDetails.submissiontime)}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700">Priority Time:</span>
										<span class="text-blue-900 ml-2">{processDetails.prioritytime || 'Not set'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700">Wait Deadline:</span>
										<span class="text-blue-900 ml-2">{formatDate(processDetails.waitdeadline)}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700">Exec Deadline:</span>
										<span class="text-blue-900 ml-2">{formatDate(processDetails.execdeadline)}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700">Assigned Executor:</span>
										<span class="text-blue-900 ml-2">{processDetails.assignedexecutorid || 'Not assigned'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700">Wait for Parents:</span>
										<span class="text-blue-900 ml-2">{processDetails.waitforparents ? 'Yes' : 'No'}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Function Specification -->
						{#if processDetails.spec}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">Function Specification</h4>
								<div class="bg-green-50 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										<div>
											<span class="font-medium text-green-700">Function Name:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.funcname || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700">Node Name:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.nodename || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700">Priority:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.priority}</span>
										</div>
										<div>
											<span class="font-medium text-green-700">Max Retries:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.maxretries}</span>
										</div>
										<div>
											<span class="font-medium text-green-700">Max Wait Time:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.maxwaittime === -1 ? 'No limit' : processDetails.spec.maxwaittime + 's'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700">Max Exec Time:</span>
											<span class="text-green-900 ml-2">{processDetails.spec.maxexectime === -1 ? 'No limit' : processDetails.spec.maxexectime + 's'}</span>
										</div>
										{#if processDetails.spec.label}
											<div class="col-span-2">
												<span class="font-medium text-green-700">Label:</span>
												<span class="text-green-900 ml-2">{processDetails.spec.label}</span>
											</div>
										{/if}
									</div>

									<!-- Arguments -->
									{#if processDetails.spec.args && processDetails.spec.args.length > 0}
										<div class="mt-4 pt-4 border-t border-green-200">
											<span class="font-medium text-green-700 text-sm">Arguments:</span>
											<div class="mt-1 bg-green-100 rounded p-2">
												<div class="text-green-900 font-mono text-xs">
													{JSON.stringify(processDetails.spec.args)}
												</div>
											</div>
										</div>
									{/if}

									<!-- Keyword Arguments -->
									{#if processDetails.spec.kwargs && Object.keys(processDetails.spec.kwargs).length > 0}
										<div class="mt-4 pt-4 border-t border-green-200">
											<span class="font-medium text-green-700 text-sm">Keyword Arguments:</span>
											<div class="mt-1 bg-green-100 rounded p-2">
												<pre class="text-green-900 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(processDetails.spec.kwargs, null, 2)}</pre>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Resource Conditions -->
						{#if processDetails.spec?.conditions}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">Resource Requirements</h4>
								<div class="bg-purple-50 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										<div>
											<span class="font-medium text-purple-700">Executor Type:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.executortype || 'Any'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Colony:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.colonyname}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">CPU:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.cpu || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Memory:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.mem || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Storage:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.storage || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Nodes:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.nodes || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Processes:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.processes || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700">Wall Time:</span>
											<span class="text-purple-900 ml-2">{processDetails.spec.conditions.walltime ? processDetails.spec.conditions.walltime + 's' : 'Not specified'}</span>
										</div>
									</div>

									<!-- GPU Requirements -->
									{#if processDetails.spec.conditions.gpu && (processDetails.spec.conditions.gpu.count > 0 || processDetails.spec.conditions.gpu.name)}
										<div class="mt-4 pt-4 border-t border-purple-200">
											<h5 class="font-medium text-purple-700 text-sm mb-2">GPU Requirements:</h5>
											<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
												<div>
													<span class="font-medium text-purple-700">Name:</span>
													<span class="text-purple-900 ml-2">{processDetails.spec.conditions.gpu.name || 'Any'}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700">Count:</span>
													<span class="text-purple-900 ml-2">{processDetails.spec.conditions.gpu.count}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700">Memory:</span>
													<span class="text-purple-900 ml-2">{processDetails.spec.conditions.gpu.mem || 'Not specified'}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700">Node Count:</span>
													<span class="text-purple-900 ml-2">{processDetails.spec.conditions.gpu.nodecount}</span>
												</div>
											</div>
										</div>
									{/if}

									<!-- Executor Names -->
									{#if processDetails.spec.conditions.executornames && processDetails.spec.conditions.executornames.length > 0}
										<div class="mt-4 pt-4 border-t border-purple-200">
											<span class="font-medium text-purple-700 text-sm">Specific Executors:</span>
											<div class="mt-1 text-purple-900 text-xs">
												{processDetails.spec.conditions.executornames.join(', ')}
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Environment Variables -->
						{#if processDetails.spec?.env && Object.keys(processDetails.spec.env).length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">Environment Variables</h4>
								<div class="bg-yellow-50 rounded-lg p-4">
									<div class="space-y-2 text-sm">
										{#each Object.entries(processDetails.spec.env) as [key, value]}
											<div class="flex">
												<span class="font-medium text-yellow-700 min-w-0 flex-shrink-0">{key}:</span>
												<span class="text-yellow-900 ml-2 break-all">{value}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}

						<!-- Attributes -->
						{#if processDetails.attributes && processDetails.attributes.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">Process Attributes</h4>
								<div class="bg-indigo-50 rounded-lg p-4 space-y-3">
									{#each processDetails.attributes as attr}
										<div class="border border-indigo-200 rounded p-3 bg-white">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
												<div>
													<span class="font-medium text-indigo-700">Key:</span>
													<span class="text-indigo-900 ml-2">{attr.key}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700">Value:</span>
													<span class="text-indigo-900 ml-2">{attr.value}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700">Type:</span>
													<span class="text-indigo-900 ml-2">{attr.attributetype}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700">State:</span>
													<span class="text-indigo-900 ml-2">{attr.state}</span>
												</div>
											</div>
											<div class="mt-2 pt-2 border-t border-indigo-200">
												<span class="font-medium text-indigo-700 text-xs">Attribute ID:</span>
												<div class="text-indigo-900 font-mono text-xs mt-1 break-all">{attr.attributeid}</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- File System & I/O -->
						{#if (processDetails.spec?.fs && (processDetails.spec.fs.mount || processDetails.spec.fs.snapshots || processDetails.spec.fs.dirs)) || processDetails.in?.length > 0 || processDetails.out?.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">File System & I/O</h4>
								<div class="bg-gray-50 rounded-lg p-4">
									{#if processDetails.spec?.fs}
										<div class="mb-4">
											<h5 class="font-medium text-gray-700 text-sm mb-2">File System:</h5>
											<div class="text-sm">
												{#if processDetails.spec.fs.mount}
													<div><span class="font-medium">Mount:</span> {processDetails.spec.fs.mount}</div>
												{/if}
												{#if processDetails.spec.fs.snapshots}
													<div><span class="font-medium">Snapshots:</span> {JSON.stringify(processDetails.spec.fs.snapshots)}</div>
												{/if}
												{#if processDetails.spec.fs.dirs}
													<div><span class="font-medium">Directories:</span> {JSON.stringify(processDetails.spec.fs.dirs)}</div>
												{/if}
											</div>
										</div>
									{/if}
									{#if processDetails.in?.length > 0}
										<div class="mb-4">
											<h5 class="font-medium text-gray-700 text-sm mb-2">Input:</h5>
											<pre class="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(processDetails.in, null, 2)}</pre>
										</div>
									{/if}
									{#if processDetails.out?.length > 0}
										<div>
											<h5 class="font-medium text-gray-700 text-sm mb-2">Output:</h5>
											<pre class="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(processDetails.out, null, 2)}</pre>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Errors -->
						{#if processDetails.errors && processDetails.errors.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 mb-3">Errors</h4>
								<div class="bg-red-50 rounded-lg p-4">
									{#each processDetails.errors as error}
										<div class="text-red-700 text-sm mb-2 last:mb-0">{error}</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500 mb-6">
							Click "Refresh Details" to load comprehensive process information
						</div>
					{/if}

					<!-- Delete Status Messages -->
					{#if deletingStatus === 'error'}
						<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
							<strong>Error:</strong> {deleteError}
						</div>
					{:else if deletingStatus === 'success'}
						<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">
							✓ Process deleted successfully!
						</div>
					{/if}

					<!-- Delete Confirmation -->
					{#if showDeleteConfirm}
						<div class="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<h5 class="text-sm font-medium text-yellow-800 mb-2">Confirm Deletion</h5>
							<p class="text-sm text-yellow-700 mb-3">
								Are you sure you want to delete this process? This action cannot be undone.
							</p>
							{#if isPartOfWorkflow()}
								<div class="mb-3 bg-orange-50 border border-orange-200 rounded p-3">
									<div class="flex items-start">
										<svg class="w-4 h-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div>
											<p class="text-sm text-orange-800 font-medium">Workflow Process Detected</p>
											<p class="text-xs text-orange-700 mt-1">
												This process is part of workflow ID: <span class="font-mono">{process?.processgraphid}</span>
											</p>
											<p class="text-xs text-orange-700 mt-1">
												Deleting workflow processes may fail. Consider using workflow management tools instead.
											</p>
										</div>
									</div>
								</div>
							{/if}
							{#if hasParentsOrChildren()}
								<div class="mb-3 bg-orange-50 border border-orange-200 rounded p-3">
									<div class="flex items-start">
										<svg class="w-4 h-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div>
											<p class="text-sm text-orange-800 font-medium">Process Dependencies Detected</p>
											{#if process?.parents && process.parents.length > 0}
												<p class="text-xs text-orange-700 mt-1">
													This process has {process.parents.length} parent process(es)
												</p>
											{/if}
											{#if process?.children && process.children.length > 0}
												<p class="text-xs text-orange-700 mt-1">
													This process has {process.children.length} child process(es)
												</p>
											{/if}
											<p class="text-xs text-orange-700 mt-1">
												Deleting processes with dependencies may fail or cause workflow issues.
											</p>
										</div>
									</div>
								</div>
							{/if}
							<div class="flex space-x-3">
								<button
									onclick={deleteProcess}
									disabled={deletingStatus === 'deleting'}
									class="text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1.5 rounded transition-colors"
								>
									{#if deletingStatus === 'deleting'}
										<div class="flex items-center">
											<div class="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-2"></div>
											Deleting...
										</div>
									{:else}
										Delete Anyway
									{/if}
								</button>
								<button
									onclick={cancelDelete}
									disabled={deletingStatus === 'deleting'}
									class="text-sm bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-between items-center">
						<div class="flex space-x-3">
							<button
								onclick={loadProcessDetails}
								disabled={loadingDetails || deletingStatus === 'deleting'}
								class="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded transition-colors"
							>
								{loadingDetails ? 'Loading...' : 'Refresh Details'}
							</button>
							{#if !showDeleteConfirm && deletingStatus !== 'success'}
								{#if !canDeleteProcess()}
									<!-- Warning button for workflow/dependency processes -->
									<div class="relative group">
										<button
											onclick={confirmDelete}
											disabled={deletingStatus === 'deleting'}
											class="text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-3 py-1.5 rounded transition-colors flex items-center"
										>
											<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
											</svg>
											Delete Process
										</button>
										<!-- Tooltip -->
										<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
											{getDeleteDisabledReason()}
										</div>
									</div>
								{:else}
									<!-- Normal delete button -->
									<button
										onclick={confirmDelete}
										disabled={deletingStatus === 'deleting'}
										class="text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1.5 rounded transition-colors"
									>
										Delete Process
									</button>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
				<div class="flex justify-end">
					<button
						onclick={onClose}
						class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
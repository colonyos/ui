<script lang="ts">
	import type { Process } from '$lib/types/process';
	import { ColonyClient } from '$lib/api/colony';
	import { getProcessStateLabel, getProcessStateColor, ProcessState } from '$lib/types/process';

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
	let loadingLogs = $state(false);
	let logsError = $state('');
	let processLogs: any[] = $state([]);
	let deletingStatus: 'idle' | 'deleting' | 'success' | 'error' = $state('idle');
	let deleteError = $state('');
	let showDeleteConfirm = $state(false);

	// WebSocket state
	let wsConnection: WebSocket | null = $state(null);
	let wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = $state('disconnected');
	let lastUpdateTime = $state<Date | null>(null);

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

			if (import.meta.env.DEV) {
				console.log('=== getProcess Response ===');
				console.log('Full response:', JSON.stringify(processDetails, null, 2));
				console.log('Response type:', typeof processDetails);
				console.log('Response keys:', Object.keys(processDetails || {}));
			}

			// Load logs after getting process details
			await loadProcessLogs();

		} catch (error) {
			console.error('Failed to load process details:', error);
			detailsError = error instanceof Error ? error.message : String(error);
		} finally {
			loadingDetails = false;
		}
	}

	async function loadProcessLogs() {
		if (!process || !client || !processDetails) {
			return;
		}

		loadingLogs = true;
		logsError = '';
		processLogs = [];

		try {
			const colonyName = process.colonyname || processDetails.spec?.conditions?.colonyname;
			const executorName = '';

			if (!colonyName) {
				logsError = 'Colony name not available';
				return;
			}

			console.log('=== Fetching process logs ===');
			console.log('Colony:', colonyName);
			console.log('Process ID:', process.processid);
			console.log('Executor:', executorName);

			const logs = await client.getProcessLogs(
				colonyName,
				process.processid,
				executorName,
				100,
				0
			);

			if (Array.isArray(logs)) {
				processLogs = logs;
			} else {
				processLogs = [];
			}

			console.log('=== Logs loaded ===');
			console.log('Log count:', processLogs.length);

		} catch (error) {
			console.error('Failed to load process logs:', error);
			logsError = error instanceof Error ? error.message : String(error);
		} finally {
			loadingLogs = false;
		}
	}

	function setupWebSocketSubscription() {
		if (!process || !client) {
			return;
		}

		// Close existing connection if any
		if (wsConnection) {
			wsConnection.close();
			wsConnection = null;
		}

		const colonyName = process.colonyname || processDetails?.spec?.conditions?.colonyname;
		if (!colonyName) {
			console.warn('Cannot setup WebSocket: colony name not available');
			return;
		}

		// Don't subscribe if process is already in a terminal state
		const currentState = processDetails?.state ?? process.state;
		if (currentState === ProcessState.SUCCESS || currentState === ProcessState.FAILED) {
			if (import.meta.env.DEV) {
				console.log('⏹️ Process already in terminal state, skipping WebSocket subscription');
			}
			return;
		}

		wsStatus = 'connecting';

		try {
			if (import.meta.env.DEV) {
				console.log('🔌 Setting up WebSocket subscription for process:', process.processid);
				console.log('Current state:', currentState, 'Subscribing for next state transition');
			}

			// Subscribe to the next logical state transition
			// For WAITING (0) -> subscribe to RUNNING (1)
			// For RUNNING (1) -> subscribe to SUCCESS (2) or FAILED (3)
			// We'll primarily subscribe to SUCCESS as it's the most common completion state
			const targetState = currentState === ProcessState.WAITING
				? ProcessState.RUNNING
				: ProcessState.SUCCESS;

			wsConnection = client.subscribeProcess(
				colonyName,
				process.processid,
				targetState,
				3600, // 1 hour timeout
				(updatedProcess) => {
					if (import.meta.env.DEV) {
						console.log('📡 Received real-time process update:', updatedProcess);
					}

					// Update the process details with the new data
					processDetails = updatedProcess;
					lastUpdateTime = new Date();

					// Reload logs if process reached a terminal state
					if (updatedProcess.state === ProcessState.SUCCESS ||
					    updatedProcess.state === ProcessState.FAILED) {
						loadProcessLogs();
					}

					// If we just transitioned to RUNNING, re-subscribe for completion
					if (updatedProcess.state === ProcessState.RUNNING && targetState === ProcessState.RUNNING) {
						setTimeout(() => {
							setupWebSocketSubscription(); // Re-subscribe for completion
						}, 100);
					}
				},
				(error) => {
					console.error('❌ WebSocket subscription error:', error);
					wsStatus = 'error';
				},
				() => {
					if (import.meta.env.DEV) {
						console.log('🔌 WebSocket connection closed');
					}
					wsStatus = 'disconnected';
					wsConnection = null;
				}
			);

			wsStatus = 'connected';

			if (import.meta.env.DEV) {
				console.log('✅ WebSocket subscription established for state:', targetState);
			}

		} catch (error) {
			console.error('Failed to setup WebSocket:', error);
			wsStatus = 'error';
		}
	}

	function cleanupWebSocket() {
		if (wsConnection) {
			if (import.meta.env.DEV) {
				console.log('🔌 Cleaning up WebSocket connection');
			}
			wsConnection.close();
			wsConnection = null;
		}
		wsStatus = 'disconnected';
	}

	// Load details when modal shows and setup WebSocket
	$effect(() => {
		if (show && process) {
			// Load initial details
			loadProcessDetails().then(() => {
				// Setup WebSocket subscription after details are loaded
				setupWebSocketSubscription();
			});

			// Cleanup WebSocket when modal closes
			return () => {
				cleanupWebSocket();
			};
		} else {
			// Cleanup if modal is hidden
			cleanupWebSocket();
		}
	});

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

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
			// The timeout is now handled by the $effect below
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

	// Effect to handle auto-close after delete success with proper cleanup
	$effect(() => {
		if (deletingStatus === 'success') {
			const timeoutId = setTimeout(() => {
				onProcessDeleted?.();
				onClose();
				deletingStatus = 'idle';
				showDeleteConfirm = false;
			}, 1500);

			return () => clearTimeout(timeoutId);
		}
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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="process-details-title" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-start">
					<div class="flex-1">
						<div class="flex items-center gap-3">
							<h3 id="process-details-title" class="text-lg font-semibold text-gray-900 dark:text-white">Process Details</h3>

							<!-- WebSocket Status Indicator -->
							{#if wsStatus === 'connected'}
								<span class="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full" title="Real-time updates active">
									<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									Live
								</span>
							{:else if wsStatus === 'connecting'}
								<span class="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full" title="Connecting to real-time updates">
									<span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
									Connecting
								</span>
							{:else if wsStatus === 'error'}
								<span class="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full" title="Real-time updates unavailable">
									<span class="w-2 h-2 bg-red-500 rounded-full"></span>
									Disconnected
								</span>
							{/if}
						</div>

						{#if process}
							<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">{process.spec?.funcname || 'Unknown Function'}</p>
							<div class="flex items-center gap-2 mt-0.5">
								<p class="text-xs text-gray-400 dark:text-slate-400 font-mono">{process.processid}</p>
								{#if lastUpdateTime}
									<span class="text-xs text-gray-400 dark:text-slate-500">
										• Updated {lastUpdateTime.toLocaleTimeString()}
									</span>
								{/if}
							</div>
						{/if}
					</div>
					<button
						onclick={onClose}
						aria-label="Close modal"
						class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
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
					<p class="text-gray-500 dark:text-slate-400">No process selected</p>
				{:else}
					<!-- Process Summary -->
					<div class="mb-6">
						<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Process Summary</h4>
						<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Status:</span>
									<span class="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full {getProcessStateColor(process.state)}">
										{getProcessStateLabel(process.state)}
									</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Function:</span>
									<span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">{process.spec?.funcname || 'Unknown'}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Initiator:</span>
									<span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">{process.initiatorname || 'Unknown'}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Assigned:</span>
									<span class="ml-2 text-sm text-gray-900 dark:text-white">{process.isassigned ? 'Yes' : 'No'}</span>
								</div>
								{#if process.processgraphid}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Workflow:</span>
										<span class="ml-2 text-sm text-blue-600 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">{process.processgraphid}</span>
										<span class="ml-2 text-xs text-orange-600 dark:text-orange-400">⚠️ Part of workflow</span>
									</div>
								{/if}
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Retries:</span>
									<span class="ml-2 text-sm text-gray-900 dark:text-white">{process.retries}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Start Time:</span>
									<span class="ml-2 text-sm text-gray-900 dark:text-white">{formatDate(process.starttime)}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">End Time:</span>
									<span class="ml-2 text-sm text-gray-900 dark:text-white">{formatDate(process.endtime)}</span>
								</div>
								<div>
									<span class="text-sm text-gray-600 dark:text-slate-300">Duration:</span>
									<span class="ml-2 text-sm text-gray-900 dark:text-white">{formatDuration(process.starttime, process.endtime)}</span>
								</div>
								{#if process.spec?.args && process.spec.args.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Input (Arguments):</span>
										<div class="ml-2 text-sm text-gray-900 dark:text-white font-mono break-all">{process.spec.args.join(', ')}</div>
									</div>
								{/if}
								{#if processDetails?.out && processDetails.out.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Output:</span>
										<div class="ml-2 text-sm text-gray-900 dark:text-white font-mono break-all">{processDetails.out.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join(', ')}</div>
									</div>
								{/if}
								{#if process.errors && process.errors.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Errors:</span>
										<div class="ml-2 mt-1">
											{#each process.errors as error}
												<div class="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded mb-1">{error}</div>
											{/each}
										</div>
									</div>
								{/if}
								{#if process.children && process.children.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Children ({process.children.length}):</span>
										<div class="ml-2 text-xs text-gray-500 dark:text-slate-400 font-mono break-all">
											{process.children.join(', ')}
										</div>
									</div>
								{/if}
								{#if process.parents && process.parents.length > 0}
									<div class="col-span-1 md:col-span-2">
										<span class="text-sm text-gray-600 dark:text-slate-300">Parents ({process.parents.length}):</span>
										<div class="ml-2 text-xs text-gray-500 dark:text-slate-400 font-mono break-all">
											{process.parents.join(', ')}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Process Timeline -->
					<div class="mb-6">
						<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Process Timeline</h4>
						<div class="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-4">
							<div class="space-y-4">
								<!-- Submitted -->
								<div class="flex items-start">
									<div class="flex-shrink-0">
										<div class="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 dark:bg-cyan-500">
											<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
										</div>
									</div>
									<div class="ml-4 flex-1">
										<div class="text-sm font-medium text-cyan-900 dark:text-cyan-100">Submitted</div>
										<div class="text-xs text-cyan-700 dark:text-cyan-300 mt-1">
											{formatDate(process.submissiontime)}
										</div>
										<div class="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5">
											by {process.initiatorname || 'Unknown'}
										</div>
									</div>
								</div>

								<!-- Assignment -->
								{#if process.isassigned}
									<div class="flex items-start">
										<div class="flex-shrink-0">
											<div class="relative">
												<div class="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 -mt-4 bg-gradient-to-b from-cyan-300 to-blue-300 dark:from-cyan-700 dark:to-blue-700"></div>
												<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500">
													<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
											</div>
										</div>
										<div class="ml-4 flex-1">
											<div class="text-sm font-medium text-blue-900 dark:text-blue-100">Assigned to Executor</div>
											<div class="text-xs text-blue-700 dark:text-blue-300 mt-1 font-mono break-all">
												{process.assignedexecutorid || (processDetails?.assignedexecutorid || 'Unknown')}
											</div>
										</div>
									</div>
								{/if}

								<!-- Started -->
								{#if process.starttime && process.starttime !== '0001-01-01T00:00:00Z' && process.starttime !== '0001-01-01T00:53:28+00:53'}
									<div class="flex items-start">
										<div class="flex-shrink-0">
											<div class="relative">
												<div class="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 -mt-4 bg-gradient-to-b from-blue-300 to-green-300 dark:from-blue-700 dark:to-green-700"></div>
												<div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 dark:bg-green-500">
													<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</div>
											</div>
										</div>
										<div class="ml-4 flex-1">
											<div class="text-sm font-medium text-green-900 dark:text-green-100">Started Execution</div>
											<div class="text-xs text-green-700 dark:text-green-300 mt-1">
												{formatDate(process.starttime)}
											</div>
										</div>
									</div>
								{/if}

								<!-- Finished -->
								{#if process.endtime && process.endtime !== '0001-01-01T00:00:00Z' && process.endtime !== '0001-01-01T00:53:28+00:53'}
									<div class="flex items-start">
										<div class="flex-shrink-0">
											<div class="relative">
												<div class="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 -mt-4 bg-gradient-to-b from-green-300 to-purple-300 dark:from-green-700 dark:to-purple-700"></div>
												<div class="flex items-center justify-center w-8 h-8 rounded-full {
													process.state === 2 ? 'bg-purple-600 dark:bg-purple-500' :
													process.state === 3 ? 'bg-red-600 dark:bg-red-500' :
													'bg-gray-600 dark:bg-gray-500'
												}">
													{#if process.state === 2}
														<!-- Success icon -->
														<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
													{:else if process.state === 3}
														<!-- Failed icon -->
														<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
														</svg>
													{:else}
														<!-- Generic finish icon -->
														<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
														</svg>
													{/if}
												</div>
											</div>
										</div>
										<div class="ml-4 flex-1">
											<div class="text-sm font-medium {
												process.state === 2 ? 'text-purple-900 dark:text-purple-100' :
												process.state === 3 ? 'text-red-900 dark:text-red-100' :
												'text-gray-900 dark:text-gray-100'
											}">
												Finished - {getProcessStateLabel(process.state)}
											</div>
											<div class="text-xs {
												process.state === 2 ? 'text-purple-700 dark:text-purple-300' :
												process.state === 3 ? 'text-red-700 dark:text-red-300' :
												'text-gray-700 dark:text-gray-300'
											} mt-1">
												{formatDate(process.endtime)}
											</div>
											<div class="text-xs {
												process.state === 2 ? 'text-purple-600 dark:text-purple-400' :
												process.state === 3 ? 'text-red-600 dark:text-red-400' :
												'text-gray-600 dark:text-gray-400'
											} mt-0.5">
												Duration: {formatDuration(process.starttime, process.endtime)}
											</div>
										</div>
									</div>
								{/if}

								<!-- Current State (if not finished) -->
								{#if !process.endtime || process.endtime === '0001-01-01T00:00:00Z' || process.endtime === '0001-01-01T00:53:28+00:53'}
									<div class="flex items-start">
										<div class="flex-shrink-0">
											<div class="relative">
												<div class="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 -mt-4 bg-gradient-to-b from-green-300 to-yellow-300 dark:from-green-700 dark:to-yellow-700"></div>
												<div class="flex items-center justify-center w-8 h-8 rounded-full {
													process.state === 0 ? 'bg-yellow-600 dark:bg-yellow-500' :
													process.state === 1 ? 'bg-blue-600 dark:bg-blue-500' :
													'bg-gray-600 dark:bg-gray-500'
												}">
													{#if process.state === 1}
														<!-- Running - spinner -->
														<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
													{:else}
														<!-- Waiting - clock -->
														<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
													{/if}
												</div>
											</div>
										</div>
										<div class="ml-4 flex-1">
											<div class="text-sm font-medium {
												process.state === 0 ? 'text-yellow-900 dark:text-yellow-100' :
												process.state === 1 ? 'text-blue-900 dark:text-blue-100' :
												'text-gray-900 dark:text-gray-100'
											}">
												{getProcessStateLabel(process.state)}
											</div>
											{#if process.state === 1 && process.starttime && process.starttime !== '0001-01-01T00:00:00Z'}
												<div class="text-xs {
													process.state === 0 ? 'text-yellow-700 dark:text-yellow-300' :
													process.state === 1 ? 'text-blue-700 dark:text-blue-300' :
													'text-gray-700 dark:text-gray-300'
												} mt-1">
													Running for {formatDuration(process.starttime, new Date().toISOString())}
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Detailed Information -->
					{#if loadingDetails}
						<div class="flex items-center justify-center py-8 text-gray-500 dark:text-slate-400">
							<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
							Loading process details...
						</div>
					{:else if detailsError}
						<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
							<strong>Error:</strong> {detailsError}
						</div>
					{:else if processDetails}
						<!-- Timing Information -->
						<div class="mb-6">
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Timing & Scheduling</h4>
							<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Submission Time:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{formatDate(processDetails.submissiontime)}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Priority Time:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{processDetails.prioritytime || 'Not set'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Wait Deadline:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{formatDate(processDetails.waitdeadline)}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Exec Deadline:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{formatDate(processDetails.execdeadline)}</span>
									</div>
									<div class="col-span-1 md:col-span-2">
										<span class="font-medium text-blue-700 dark:text-blue-300">Assigned Executor:</span>
										<div class="text-blue-900 dark:text-blue-100 ml-2 text-xs font-mono break-all">{processDetails.assignedexecutorid || 'Not assigned'}</div>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Wait for Parents:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{processDetails.waitforparents ? 'Yes' : 'No'}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Function Specification -->
						{#if processDetails.spec}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Function Specification</h4>
								<div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Function Name:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.funcname || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Node Name:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.nodename || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Priority:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.priority}</span>
										</div>
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Max Retries:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.maxretries}</span>
										</div>
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Max Wait Time:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.maxwaittime === -1 ? 'No limit' : processDetails.spec.maxwaittime + 's'}</span>
										</div>
										<div>
											<span class="font-medium text-green-700 dark:text-green-300">Max Exec Time:</span>
											<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.maxexectime === -1 ? 'No limit' : processDetails.spec.maxexectime + 's'}</span>
										</div>
										{#if processDetails.spec.label}
											<div class="col-span-2">
												<span class="font-medium text-green-700 dark:text-green-300">Label:</span>
												<span class="text-green-900 dark:text-green-100 ml-2">{processDetails.spec.label}</span>
											</div>
										{/if}
									</div>

									<!-- Arguments -->
									{#if processDetails.spec.args && processDetails.spec.args.length > 0}
										<div class="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
											<span class="font-medium text-green-700 dark:text-green-300 text-sm">Arguments:</span>
											<div class="mt-1 bg-green-100 dark:bg-green-900/30 rounded p-2">
												<div class="text-green-900 dark:text-green-100 font-mono text-xs break-all">
													{JSON.stringify(processDetails.spec.args)}
												</div>
											</div>
										</div>
									{/if}

									<!-- Keyword Arguments -->
									{#if processDetails.spec.kwargs && Object.keys(processDetails.spec.kwargs).length > 0}
										<div class="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
											<span class="font-medium text-green-700 dark:text-green-300 text-sm">Keyword Arguments:</span>
											<div class="mt-1 bg-green-100 dark:bg-green-900/30 rounded p-2">
												<pre class="text-green-900 dark:text-green-100 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(processDetails.spec.kwargs, null, 2)}</pre>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Resource Conditions -->
						{#if processDetails.spec?.conditions}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Resource Requirements</h4>
								<div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Executor Type:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.executortype || 'Any'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Colony:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.colonyname}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">CPU:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.cpu || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Memory:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.mem || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Storage:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.storage || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Nodes:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.nodes || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Processes:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.processes || 'Not specified'}</span>
										</div>
										<div>
											<span class="font-medium text-purple-700 dark:text-purple-300">Wall Time:</span>
											<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.walltime ? processDetails.spec.conditions.walltime + 's' : 'Not specified'}</span>
										</div>
									</div>

									<!-- GPU Requirements -->
									{#if processDetails.spec.conditions.gpu && (processDetails.spec.conditions.gpu.count > 0 || processDetails.spec.conditions.gpu.name)}
										<div class="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
											<h5 class="font-medium text-purple-700 dark:text-purple-300 text-sm mb-2">GPU Requirements:</h5>
											<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
												<div>
													<span class="font-medium text-purple-700 dark:text-purple-300">Name:</span>
													<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.gpu.name || 'Any'}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700 dark:text-purple-300">Count:</span>
													<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.gpu.count}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700 dark:text-purple-300">Memory:</span>
													<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.gpu.mem || 'Not specified'}</span>
												</div>
												<div>
													<span class="font-medium text-purple-700 dark:text-purple-300">Node Count:</span>
													<span class="text-purple-900 dark:text-purple-100 ml-2">{processDetails.spec.conditions.gpu.nodecount}</span>
												</div>
											</div>
										</div>
									{/if}

									<!-- Executor Names -->
									{#if processDetails.spec.conditions.executornames && processDetails.spec.conditions.executornames.length > 0}
										<div class="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
											<span class="font-medium text-purple-700 dark:text-purple-300 text-sm">Specific Executors:</span>
											<div class="mt-1 text-purple-900 dark:text-purple-100 text-xs">
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
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Environment Variables</h4>
								<div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
									<div class="space-y-2 text-sm">
										{#each Object.entries(processDetails.spec.env) as [key, value]}
											<div class="flex">
												<span class="font-medium text-yellow-700 dark:text-yellow-300 min-w-0 flex-shrink-0">{key}:</span>
												<span class="text-yellow-900 dark:text-yellow-100 ml-2 break-all">{value}</span>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}

						<!-- Attributes -->
						{#if processDetails.attributes && processDetails.attributes.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Process Attributes</h4>
								<div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-3">
									{#each processDetails.attributes as attr}
										<div class="border border-indigo-200 dark:border-indigo-800 rounded p-3 bg-white dark:bg-slate-700">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
												<div>
													<span class="font-medium text-indigo-700 dark:text-indigo-300">Key:</span>
													<span class="text-indigo-900 dark:text-indigo-100 ml-2">{attr.key}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700 dark:text-indigo-300">Value:</span>
													<span class="text-indigo-900 dark:text-indigo-100 ml-2">{attr.value}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700 dark:text-indigo-300">Type:</span>
													<span class="text-indigo-900 dark:text-indigo-100 ml-2">{attr.attributetype}</span>
												</div>
												<div>
													<span class="font-medium text-indigo-700 dark:text-indigo-300">State:</span>
													<span class="text-indigo-900 dark:text-indigo-100 ml-2">{attr.state}</span>
												</div>
											</div>
											<div class="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
												<span class="font-medium text-indigo-700 dark:text-indigo-300 text-xs">Attribute ID:</span>
												<div class="text-indigo-900 dark:text-indigo-100 font-mono text-xs mt-1 break-all">{attr.attributeid}</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- File System & I/O -->
						{#if (processDetails.spec?.fs && (processDetails.spec.fs.mount || processDetails.spec.fs.snapshots || processDetails.spec.fs.dirs)) || processDetails.in?.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">File System & I/O</h4>
								<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4">
									{#if processDetails.spec?.fs}
										<div class="mb-4">
											<h5 class="font-medium text-gray-700 dark:text-slate-200 text-sm mb-2">File System:</h5>
											<div class="text-sm text-gray-900 dark:text-slate-100">
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
										<div>
											<h5 class="font-medium text-gray-700 dark:text-slate-200 text-sm mb-2">Input Files:</h5>
											<pre class="text-xs text-gray-700 dark:text-slate-100 whitespace-pre-wrap">{JSON.stringify(processDetails.in, null, 2)}</pre>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Errors -->
						{#if processDetails.errors && processDetails.errors.length > 0}
							<div class="mb-6">
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Errors</h4>
								<div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
									{#each processDetails.errors as error}
										<div class="text-red-700 dark:text-red-300 text-sm mb-2 last:mb-0">{error}</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Process Logs -->
						<div class="mb-6">
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Process Logs</h4>
							{#if loadingLogs}
								<div class="flex items-center justify-center py-8 text-gray-500 dark:text-slate-400">
									<div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
									Loading logs...
								</div>
							{:else if logsError}
								<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
									<strong>Error:</strong> {logsError}
								</div>
							{:else if processLogs.length === 0}
								<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 text-center text-gray-500 dark:text-slate-300">
									No logs available for this process
								</div>
							{:else}
								<div class="bg-gray-50 dark:bg-slate-800 rounded-lg p-2 max-h-96 overflow-y-auto">
									<div class="space-y-1 font-mono text-xs">
										{#each processLogs as log}
											<div class="border-b border-gray-200 dark:border-slate-600 pb-1 last:border-b-0">
												<div class="flex justify-between items-center gap-2">
													<span class="text-gray-500 dark:text-slate-400 text-[10px] whitespace-nowrap">
														{new Date((log.timestamp || 0) / 1000000).toLocaleString()}
													</span>
													{#if log.messagetype}
														<span class="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap {
															log.messagetype === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
															log.messagetype === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
															'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
														}">
															{log.messagetype}
														</span>
													{/if}
												</div>
												<div class="text-gray-900 dark:text-slate-100 whitespace-pre-wrap break-words text-[11px] leading-tight">
													{log.message || ''}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 text-center text-gray-500 dark:text-slate-300 mb-6">
							Click "Refresh Details" to load comprehensive process information
						</div>
					{/if}

					<!-- Delete Status Messages -->
					{#if deletingStatus === 'error'}
						<div class="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded">
							<strong>Error:</strong> {deleteError}
						</div>
					{:else if deletingStatus === 'success'}
						<div class="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded">
							✓ Process deleted successfully!
						</div>
					{/if}

					<!-- Delete Confirmation -->
					{#if showDeleteConfirm}
						<div class="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
							<h5 class="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">Confirm Deletion</h5>
							<p class="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
								Are you sure you want to delete this process? This action cannot be undone.
							</p>
							{#if isPartOfWorkflow()}
								<div class="mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
									<div class="flex items-start">
										<svg class="w-4 h-4 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div>
											<p class="text-sm text-orange-800 dark:text-orange-300 font-medium">Workflow Process Detected</p>
											<p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
												This process is part of workflow ID: <span class="font-mono">{process?.processgraphid}</span>
											</p>
											<p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
												Deleting workflow processes may fail. Consider using workflow management tools instead.
											</p>
										</div>
									</div>
								</div>
							{/if}
							{#if hasParentsOrChildren()}
								<div class="mb-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
									<div class="flex items-start">
										<svg class="w-4 h-4 text-orange-600 dark:text-orange-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
										</svg>
										<div>
											<p class="text-sm text-orange-800 dark:text-orange-300 font-medium">Process Dependencies Detected</p>
											{#if process?.parents && process.parents.length > 0}
												<p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
													This process has {process.parents.length} parent process(es)
												</p>
											{/if}
											{#if process?.children && process.children.length > 0}
												<p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
													This process has {process.children.length} child process(es)
												</p>
											{/if}
											<p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
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
										<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 dark:bg-slate-800 text-white dark:text-slate-100 text-xs rounded py-1 px-2 whitespace-nowrap z-10">
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
			<div class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600">
				<div class="flex justify-end">
					<button
						onclick={onClose}
						class="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-lg transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
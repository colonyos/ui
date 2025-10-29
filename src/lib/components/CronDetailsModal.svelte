<script lang="ts">
	import type { Cron } from '$lib/types/cron';
	import { ColonyClient } from '$lib/api/colony';

	interface Props {
		show: boolean;
		cron: Cron | null;
		client: ColonyClient | null;
		onClose: () => void;
	}

	let { show, cron, client, onClose }: Props = $props();

	interface CronDetails {
		cronid?: string;
		initiatorid?: string;
		initiatorname?: string;
		colonyname?: string;
		name?: string;
		cronexpression?: string;
		interval?: number;
		random?: boolean;
		nextrun?: string;
		lastrun?: string;
		workflowspec?: string;
		prevprocessgraphid?: string;
		waitforprevprocessgraph?: boolean;
		checkerperiod?: number;
	}

	interface WorkflowSpec {
		colonyname?: string;
		functionspecs?: FunctionSpec[];
	}

	interface FunctionSpec {
		nodename?: string;
		funcname?: string;
		args?: any;
		kwargs?: any;
		priority?: number;
		maxwaittime?: number;
		maxexectime?: number;
		maxretries?: number;
		conditions?: any;
		label?: string;
		fs?: any;
		env?: any;
	}

	let loadingStatus: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
	let loadingError = $state('');
	let cronDetails: CronDetails | null = $state(null);
	let workflowSpec: WorkflowSpec | null = $state(null);

	$effect(() => {
		if (show && cron && client) {
			loadCronDetails();
		}
	});

	async function loadCronDetails() {
		if (!cron || !client) return;

		loadingStatus = 'loading';
		loadingError = '';
		cronDetails = null;

		try {
			const result = await client.getCron(cron.cronid);
			cronDetails = result;
			
			// Parse the workflow spec if it exists
			if (result.workflowspec) {
				try {
					workflowSpec = JSON.parse(result.workflowspec);
				} catch (parseError) {
					console.warn('Failed to parse workflowspec:', parseError);
					workflowSpec = null;
				}
			}
			
			loadingStatus = 'success';
		} catch (error) {
			console.error('Failed to load cron details:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			loadingStatus = 'error';
		}
	}

	function formatDuration(seconds: number): string {
		if (seconds === 0) return 'No limit';
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && onClose()}>
		<div class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
				<div class="flex justify-between items-start">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cron Job Details</h3>
						{#if cron}
							<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">{cron.name}</p>
							<p class="text-xs text-gray-400 dark:text-slate-400 font-mono">{cron.cronid}</p>
						{/if}
					</div>
					<button
						onclick={onClose}
						aria-label="Close"
						class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
				{#if loadingStatus === 'loading'}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
						<span class="text-gray-600 dark:text-slate-300">Loading cron details...</span>
					</div>
				{:else if loadingStatus === 'error'}
					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
						<strong>Error:</strong> {loadingError}
					</div>
				{:else if loadingStatus === 'success' && cronDetails}
					<div class="space-y-6">
						<!-- Basic Information -->
						<div>
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
							<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 space-y-2">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Name:</span>
										<span class="text-gray-900 dark:text-white ml-2">{cronDetails.name}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Colony:</span>
										<span class="text-gray-900 dark:text-white ml-2">{cronDetails.colonyname}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Schedule:</span>
										<span class="text-gray-900 dark:text-white ml-2 font-mono">{cronDetails.cronexpression}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Initiator:</span>
										<span class="text-gray-900 dark:text-white ml-2">{cronDetails.initiatorname}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Next Run:</span>
										<span class="text-gray-900 dark:text-white ml-2">{cronDetails.nextrun ? new Date(cronDetails.nextrun).toLocaleString() : 'Not scheduled'}</span>
									</div>
									<div>
										<span class="font-medium text-gray-700 dark:text-slate-300">Last Run:</span>
										<span class="text-gray-900 dark:text-white ml-2">{cronDetails.lastrun ? new Date(cronDetails.lastrun).toLocaleString() : 'Never'}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Configuration -->
						<div>
							<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Configuration</h4>
							<div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Random:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{cronDetails.random ? 'Yes' : 'No'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Checker Period:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{cronDetails.checkerperiod ? formatDuration(cronDetails.checkerperiod / 1000) : 'Not set'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Wait for Previous:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{cronDetails.waitforprevprocessgraph ? 'Yes' : 'No'}</span>
									</div>
									<div>
										<span class="font-medium text-blue-700 dark:text-blue-300">Interval:</span>
										<span class="text-blue-900 dark:text-blue-100 ml-2">{cronDetails.interval && cronDetails.interval > 0 ? formatDuration(cronDetails.interval) : 'Not set'}</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Function Specifications -->
						{#if workflowSpec && workflowSpec.functionspecs && workflowSpec.functionspecs.length > 0}
							<div>
								<h4 class="text-md font-medium text-gray-900 dark:text-white mb-3">Function Specifications</h4>
								<div class="space-y-4">
									{#each workflowSpec.functionspecs as funcSpec, i}
										<div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
											<h5 class="font-medium text-green-800 dark:text-green-300 mb-3">Function {i + 1}</h5>
											<div class="space-y-3 text-sm">
												<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<span class="font-medium text-green-700 dark:text-green-300">Node Name:</span>
														<span class="text-green-900 dark:text-green-100 ml-2">{funcSpec.nodename || 'Not set'}</span>
													</div>
													<div>
														<span class="font-medium text-green-700 dark:text-green-300">Function Name:</span>
														<span class="text-green-900 dark:text-green-100 ml-2">{funcSpec.funcname || 'Not set'}</span>
													</div>
													<div>
														<span class="font-medium text-green-700 dark:text-green-300">Label:</span>
														<span class="text-green-900 dark:text-green-100 ml-2">{funcSpec.label || 'Not set'}</span>
													</div>
													<div>
														<span class="font-medium text-green-700 dark:text-green-300">Priority:</span>
														<span class="text-green-900 dark:text-green-100 ml-2">{funcSpec.priority !== undefined ? funcSpec.priority : 'Not set'}</span>
													</div>
												</div>

												<!-- Execution Limits -->
												<div class="border-t border-green-200 dark:border-green-800 pt-3">
													<h6 class="font-medium text-green-800 dark:text-green-300 mb-2">Execution Limits</h6>
													<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
														<div>
															<span class="font-medium text-green-700 dark:text-green-300">Max Wait:</span>
															<div class="text-green-900 dark:text-green-100">{funcSpec.maxwaittime ? formatDuration(funcSpec.maxwaittime) : 'Not set'}</div>
														</div>
														<div>
															<span class="font-medium text-green-700 dark:text-green-300">Max Exec:</span>
															<div class="text-green-900 dark:text-green-100">{funcSpec.maxexectime ? formatDuration(funcSpec.maxexectime) : 'Not set'}</div>
														</div>
														<div>
															<span class="font-medium text-green-700 dark:text-green-300">Max Retries:</span>
															<div class="text-green-900 dark:text-green-100">{funcSpec.maxretries !== undefined ? funcSpec.maxretries : 'Not set'}</div>
														</div>
													</div>
												</div>

												<!-- Arguments -->
												{#if funcSpec.args}
													<div class="border-t border-green-200 dark:border-green-800 pt-3">
														<span class="font-medium text-green-700 dark:text-green-300">Arguments:</span>
														<div class="mt-1 bg-white dark:bg-slate-800 rounded border border-green-200 dark:border-green-800 p-2 text-xs">
															<pre class="text-green-900 dark:text-green-100 font-mono whitespace-pre-wrap">{JSON.stringify(funcSpec.args, null, 2)}</pre>
														</div>
													</div>
												{/if}

												<!-- Keyword Arguments -->
												{#if funcSpec.kwargs && Object.keys(funcSpec.kwargs).length > 0}
													<div class="border-t border-green-200 dark:border-green-800 pt-3">
														<span class="font-medium text-green-700 dark:text-green-300">Keyword Arguments:</span>
														<div class="mt-1 bg-white dark:bg-slate-800 rounded border border-green-200 dark:border-green-800 p-2 text-xs">
															<pre class="text-green-900 dark:text-green-100 font-mono whitespace-pre-wrap">{JSON.stringify(funcSpec.kwargs, null, 2)}</pre>
														</div>
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-center py-8 text-gray-500 dark:text-slate-400">
						No details available
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600 flex justify-end">
				<button
					onclick={onClose}
					class="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-lg transition-colors"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
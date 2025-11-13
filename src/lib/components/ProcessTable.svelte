<script lang="ts">
	import type { Process } from '$lib/types/process';
	import { getProcessStateLabel, getProcessStateColor, ProcessState } from '$lib/types/process';
	import { formatDate, formatDuration } from '$lib/utils/dateUtils';

	interface Props {
		processes: Process[];
		onProcessClick?: (process: Process) => void;
		hideWorkflowColumn?: boolean;
	}

	let { processes, onProcessClick, hideWorkflowColumn = false }: Props = $props();

	type SortField = 'status' | 'function' | 'executor' | 'initiator' | 'deadline' | 'duration' | 'workflow' | null;
	type SortDirection = 'asc' | 'desc';

	let sortField = $state<SortField>(null);
	let sortDirection = $state<SortDirection>('asc');

	function handleSort(field: SortField) {
		if (sortField === field) {
			// Toggle direction if clicking the same field
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New field, default to ascending
			sortField = field;
			sortDirection = 'asc';
		}
	}

	// Calculate duration in milliseconds for sorting
	function getDurationMs(startTime: string, endTime: string): number {
		if (!startTime || startTime === '0001-01-01T00:00:00Z' || startTime === '0001-01-01T00:53:28+00:53') {
			return 0;
		}
		const start = new Date(startTime).getTime();
		let end: number;
		if (!endTime || endTime === '0001-01-01T00:00:00Z' || endTime === '0001-01-01T00:53:28+00:53') {
			end = Date.now();
		} else {
			end = new Date(endTime).getTime();
		}
		return end - start;
	}

	// Get deadline timestamp for sorting
	function getDeadlineMs(deadline: string): number {
		if (!deadline || deadline === '0001-01-01T00:00:00Z' || deadline === '0001-01-01T00:53:28+00:53') {
			return Infinity; // No deadline goes to the end
		}
		return new Date(deadline).getTime();
	}

	// Status sort order: waiting > running > success > failed
	function getStatusSortValue(state: number): number {
		switch (state) {
			case ProcessState.WAITING: return 0;
			case ProcessState.RUNNING: return 1;
			case ProcessState.SUCCESS: return 2;
			case ProcessState.FAILED: return 3;
			default: return 4;
		}
	}

	let sortedProcesses = $derived.by(() => {
		if (!sortField) return processes;

		const sorted = [...processes].sort((a, b) => {
			let comparison = 0;

			switch (sortField) {
				case 'status':
					comparison = getStatusSortValue(a.state) - getStatusSortValue(b.state);
					break;

				case 'function':
					const funcA = (a.spec?.funcname || '').toLowerCase();
					const funcB = (b.spec?.funcname || '').toLowerCase();
					comparison = funcA.localeCompare(funcB);
					break;

				case 'executor':
					const execA = (a.assignedexecutorid || '').toLowerCase();
					const execB = (b.assignedexecutorid || '').toLowerCase();
					comparison = execA.localeCompare(execB);
					break;

				case 'initiator':
					const initA = (a.initiatorname || '').toLowerCase();
					const initB = (b.initiatorname || '').toLowerCase();
					comparison = initA.localeCompare(initB);
					break;

				case 'deadline':
					comparison = getDeadlineMs(a.execdeadline) - getDeadlineMs(b.execdeadline);
					break;

				case 'duration':
					// Longest to shortest by default
					comparison = getDurationMs(b.starttime, b.endtime) - getDurationMs(a.starttime, a.endtime);
					break;

				case 'workflow':
					// Processes in workflow at the top
					const hasWorkflowA = !!a.processgraphid;
					const hasWorkflowB = !!b.processgraphid;
					if (hasWorkflowA && !hasWorkflowB) return -1;
					if (!hasWorkflowA && hasWorkflowB) return 1;
					// Both have workflows or both don't
					if (hasWorkflowA && hasWorkflowB) {
						comparison = (a.processgraphid || '').localeCompare(b.processgraphid || '');
					}
					break;
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return sorted;
	});


	function formatPriority(priorityTime: number): string {
		if (priorityTime === 0) return 'Normal';
		
		const now = Date.now();
		const diff = priorityTime - now;
		
		if (diff > 0) {
			return 'High';
		} else if (diff > -3600000) { // Within last hour
			return 'Medium';
		} else {
			return 'Low';
		}
	}

	function getPriorityColor(priorityTime: number): string {
		if (priorityTime === 0) return 'text-gray-600 bg-gray-100';
		
		const now = Date.now();
		const diff = priorityTime - now;
		
		if (diff > 0) {
			return 'text-red-600 bg-red-100';
		} else if (diff > -3600000) {
			return 'text-orange-600 bg-orange-100';
		} else {
			return 'text-blue-600 bg-blue-100';
		}
	}

	function getDeadlineStatus(deadline: string, state: number): { label: string; color: string } {
		if (!deadline || deadline === '0001-01-01T00:00:00Z') {
			return { label: 'No deadline', color: 'text-gray-600 bg-gray-100' };
		}

		// If process is already completed, don't show deadline warnings
		if (state === 2 || state === 3) { // Success or Failed
			return { label: 'Completed', color: 'text-gray-600 bg-gray-100' };
		}

		const deadlineDate = new Date(deadline);
		const now = new Date();
		const diff = deadlineDate.getTime() - now.getTime();

		if (diff < 0) {
			return { label: 'Overdue', color: 'text-red-600 bg-red-100' };
		} else if (diff < 3600000) { // Less than 1 hour
			return { label: 'Due soon', color: 'text-orange-600 bg-orange-100' };
		} else {
			return { label: 'On track', color: 'text-green-600 bg-green-100' };
		}
	}
</script>

{#snippet statusBadge(label: string, colorClasses: string)}
	<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {colorClasses}">
		{label}
	</span>
{/snippet}

{#snippet dateDisplay(dateString: string, label?: string)}
	<div class="text-xs text-gray-400">
		{#if label}{label}: {/if}{formatDate(dateString)}
	</div>
{/snippet}

{#snippet workflowBadge()}
	<span class="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
		Workflow
	</span>
{/snippet}

{#snippet sortIcon(field: SortField)}
	{#if sortField === field}
		<svg class="w-4 h-4 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20">
			{#if sortDirection === 'asc'}
				<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
			{:else}
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			{/if}
		</svg>
	{:else}
		<svg class="w-4 h-4 inline-block ml-1 opacity-30" fill="currentColor" viewBox="0 0 20 20">
			<path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
		</svg>
	{/if}
{/snippet}

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="table-header-cell">
					Process ID
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('status')}>
					<div class="flex items-center justify-between">
						<span>Status</span>
						{@render sortIcon('status')}
					</div>
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('function')}>
					<div class="flex items-center justify-between">
						<span>Function</span>
						{@render sortIcon('function')}
					</div>
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('executor')}>
					<div class="flex items-center justify-between">
						<span>Executor</span>
						{@render sortIcon('executor')}
					</div>
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('initiator')}>
					<div class="flex items-center justify-between">
						<span>Initiator</span>
						{@render sortIcon('initiator')}
					</div>
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('deadline')}>
					<div class="flex items-center justify-between">
						<span>Deadline</span>
						{@render sortIcon('deadline')}
					</div>
				</th>
				<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('duration')}>
					<div class="flex items-center justify-between">
						<span>Duration</span>
						{@render sortIcon('duration')}
					</div>
				</th>
				{#if !hideWorkflowColumn}
					<th class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500" onclick={() => handleSort('workflow')}>
						<div class="flex items-center justify-between">
							<span>Workflow</span>
							{@render sortIcon('workflow')}
						</div>
					</th>
				{/if}
			</tr>
		</thead>
		<tbody class="table-body">
			{#each sortedProcesses as process}
				{@const deadlineStatus = getDeadlineStatus(process.execdeadline, process.state)}
				<tr class="table-row" class:cursor-pointer={onProcessClick} onclick={() => onProcessClick?.(process)}>
					<!-- Process ID -->
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100 font-mono">{process.processid.substring(0, 16)}...</div>
							{#if process.spec?.nodename}
								<div class="text-xs text-gray-400 dark:text-slate-400">Node: {process.spec.nodename}</div>
							{/if}
						</div>
					</td>

					<!-- Status -->
					<td class="px-6 py-4 whitespace-nowrap">
						{@render statusBadge(getProcessStateLabel(process.state), getProcessStateColor(process.state))}
						{#if process.retries > 0}
							<div class="text-xs text-orange-500 mt-1">Retries: {process.retries}</div>
						{/if}
						{#if process.errors.length > 0}
							<div class="text-xs text-red-500 mt-1">{process.errors.length} error(s)</div>
						{/if}
					</td>

					<!-- Function -->
					<td class="px-6 py-4">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							<div class="font-medium whitespace-nowrap">{process.spec?.funcname || 'Unknown'}</div>
							{#if process.spec?.args && process.spec.args.length > 0}
								<div class="text-xs text-gray-400 max-w-xs truncate">Args: {process.spec.args.join(', ')}</div>
							{/if}
						</div>
					</td>

					<!-- Executor -->
					<td class="px-6 py-4 whitespace-nowrap">
						{#if process.isassigned && process.assignedexecutorid}
							<div class="text-sm text-gray-900 dark:text-slate-100 font-mono">{process.assignedexecutorid.substring(0, 12)}...</div>
							<div class="text-xs text-green-600">Assigned</div>
						{:else}
							<div class="text-sm text-gray-500 dark:text-slate-300">Not assigned</div>
							<div class="text-xs text-gray-400">Type: {process.spec?.conditions?.executortype || 'Unknown'}</div>
						{/if}
					</td>

					<!-- Initiator -->
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">{process.initiatorname || 'Unknown'}</div>
						{@render dateDisplay(process.submissiontime, 'Submitted')}
					</td>

					<!-- Deadline -->
					<td class="px-6 py-4 whitespace-nowrap">
						{#if process.execdeadline && process.execdeadline !== '0001-01-01T00:53:28+00:53'}
							{@render statusBadge(deadlineStatus.label, deadlineStatus.color)}
							<div class="text-xs text-gray-500 dark:text-slate-300 mt-1">
								{formatDate(process.execdeadline)}
							</div>
						{:else}
							<span class="text-xs text-gray-400">No deadline</span>
						{/if}
					</td>

					<!-- Duration -->
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">
							{formatDuration(process.starttime, process.endtime)}
						</div>
						{#if process.starttime && process.starttime !== '0001-01-01T00:53:28+00:53'}
							{@render dateDisplay(process.starttime, 'Started')}
						{:else}
							<div class="text-xs text-gray-400">
								Not started
							</div>
						{/if}
					</td>

					<!-- Workflow -->
					{#if !hideWorkflowColumn}
						<td class="px-6 py-4 whitespace-nowrap">
							{#if process.processgraphid}
								<div class="text-xs text-gray-500 dark:text-slate-300 font-mono">
									{process.processgraphid.substring(0, 12)}...
								</div>
								<div class="text-xs text-gray-400 mt-1">
									{#if process.parents.length > 0}
										<span class="inline-flex items-center text-orange-600">
											<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
											</svg>
											{process.parents.length} parent(s)
										</span>
									{/if}
									{#if process.children.length > 0}
										<span class="inline-flex items-center text-green-600 {process.parents.length > 0 ? 'ml-2' : ''}">
											<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
											{process.children.length} child(ren)
										</span>
									{/if}
									{#if process.parents.length === 0 && process.children.length === 0}
										<span class="text-gray-400">Standalone</span>
									{/if}
								</div>
							{:else}
								<div class="text-sm text-gray-500 dark:text-slate-300">-</div>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if sortedProcesses.length === 0}
		<div class="table-empty">No processes found</div>
	{/if}
</div>
<script lang="ts">
	import type { Workflow } from '$lib/types/workflow';
	import { getProcessStateLabel, getProcessStateColor, formatWorkflowDuration, formatWorkflowTime } from '$lib/types/workflow';

	interface Props {
		workflows: Workflow[];
		onWorkflowClick?: (workflow: Workflow) => void;
		loading?: boolean;
	}

	let { workflows, onWorkflowClick, loading = false }: Props = $props();
</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th scope="col" class="table-header-cell">
					Workflow
				</th>
				<th scope="col" class="table-header-cell">
					State
				</th>
				<th scope="col" class="table-header-cell">
					Initiator
				</th>
				<th scope="col" class="table-header-cell">
					Submitted
				</th>
				<th scope="col" class="table-header-cell">
					Duration
				</th>
				<th scope="col" class="table-header-cell">
					Processes
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each workflows as workflow (workflow.processgraphid)}
				<tr
					class="table-row {onWorkflowClick ? 'cursor-pointer' : ''}"
					onclick={() => onWorkflowClick?.(workflow)}
				>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 truncate max-w-64" title={workflow.processgraphid}>
								{workflow.processgraphid}
							</div>
							<div class="text-xs text-gray-400 dark:text-slate-400">{workflow.colonyname}</div>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getProcessStateColor(workflow.state)}"
						>
							{getProcessStateLabel(workflow.state)}
						</span>
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="text-sm text-gray-900 dark:text-slate-100">{workflow.initiatorname}</div>
						<div class="text-xs text-gray-500 dark:text-slate-300 truncate max-w-32" title={workflow.initiatorid}>
							{workflow.initiatorid}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{formatWorkflowTime(workflow.submissiontime)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{formatWorkflowDuration(workflow.starttime, workflow.endtime)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{workflow.processs ? workflow.processs.length : 0}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if workflows.length === 0}
		<div class="table-empty">
			{#if loading}
				Loading workflows...
			{:else}
				No workflows found
			{/if}
		</div>
	{/if}
</div>
<script lang="ts">
	import type { Workflow } from '$lib/types/workflow';
	import { getProcessStateLabel, getProcessStateColor, formatWorkflowDuration, formatWorkflowTime } from '$lib/types/workflow';

	interface Props {
		workflows: Workflow[];
		onWorkflowClick?: (workflow: Workflow) => void;
	}

	let { workflows, onWorkflowClick }: Props = $props();
</script>

<div class="overflow-x-auto bg-white shadow-md rounded-lg">
	<table class="min-w-full divide-y divide-gray-200">
		<thead class="bg-gray-50">
			<tr>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Workflow
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					State
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Initiator
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Submitted
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Duration
				</th>
				<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
					Processes
				</th>
			</tr>
		</thead>
		<tbody class="bg-white divide-y divide-gray-200">
			{#each workflows as workflow (workflow.processgraphid)}
				<tr
					class="hover:bg-gray-50 {onWorkflowClick ? 'cursor-pointer' : ''}"
					on:click={() => onWorkflowClick?.(workflow)}
				>
					<td class="px-6 py-4 whitespace-nowrap">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 truncate max-w-64" title={workflow.processgraphid}>
								{workflow.processgraphid}
							</div>
							<div class="text-xs text-gray-400">{workflow.colonyname}</div>
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
						<div class="text-sm text-gray-900">{workflow.initiatorname}</div>
						<div class="text-xs text-gray-500 truncate max-w-32" title={workflow.initiatorid}>
							{workflow.initiatorid}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
						{formatWorkflowTime(workflow.submissiontime)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
						{formatWorkflowDuration(workflow.starttime, workflow.endtime)}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
						{workflow.processs ? workflow.processs.length : 0}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if workflows.length === 0}
		<div class="text-center py-8 text-gray-500">No workflows found</div>
	{/if}
</div>
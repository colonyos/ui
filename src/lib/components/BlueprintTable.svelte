<script lang="ts">
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';

	interface Props {
		blueprints: (Blueprint | BlueprintDefinition)[];
		onBlueprintClick?: (blueprint: Blueprint | BlueprintDefinition) => void;
		onRemoveBlueprint?: (blueprint: Blueprint | BlueprintDefinition) => void;
	}

	let { blueprints, onBlueprintClick, onRemoveBlueprint }: Props = $props();

	function formatDate(dateString?: string): string {
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			return 'Never';
		}
		return new Date(dateString).toLocaleString();
	}

	function getKindColor(kind: string): string {
		const colors: Record<string, string> = {
			'dockerdeployment': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
			'deployment': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
			'service': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
			'job': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900',
			'cronjob': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900'
		};
		return colors[kind.toLowerCase()] || 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
	}
</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th class="table-header-cell">
					Name
				</th>
				<th class="table-header-cell">
					Kind
				</th>
				<th class="table-header-cell">
					Colony
				</th>
				<th class="table-header-cell">
					Group
				</th>
				<th class="table-header-cell">
					Version
				</th>
				<th class="table-header-cell">
					Scope
				</th>
				<th class="table-header-cell">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="table-body">
			{#each blueprints as blueprint (('blueprintdefinitionid' in blueprint ? blueprint.blueprintdefinitionid : blueprint.blueprintid))}
				<tr
					class="table-row {onBlueprintClick ? 'cursor-pointer' : ''}"
					onclick={() => onBlueprintClick?.(blueprint)}
				>
					<!-- Name -->
					<td class="px-6 py-4">
						<div class="flex flex-col">
							<div class="text-sm font-medium text-gray-900 dark:text-slate-100">{blueprint.metadata.name}</div>
							<div class="text-xs text-gray-500 dark:text-slate-300 font-mono">
								{'blueprintdefinitionid' in blueprint ? blueprint.blueprintdefinitionid : blueprint.blueprintid}
							</div>
						</div>
					</td>

					<!-- Kind (from spec.names.kind for definitions) -->
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getKindColor(
								(blueprint.spec as any)?.names?.kind || blueprint.kind || ''
							)}"
						>
							{(blueprint.spec as any)?.names?.kind || blueprint.kind || '-'}
						</span>
					</td>

					<!-- Colony/Namespace -->
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{blueprint.metadata.namespace || '-'}
					</td>

					<!-- Group (from spec.group) -->
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300 font-mono">
						{(blueprint.spec as any)?.group || '-'}
					</td>

					<!-- Version (from spec.version) -->
					<td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-slate-100">
						{(blueprint.spec as any)?.version || '-'}
					</td>

					<!-- Scope (from spec.scope) -->
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
						{(blueprint.spec as any)?.scope || '-'}
					</td>

					<!-- Actions -->
					<td class="px-6 py-4 whitespace-nowrap">
						{#if onRemoveBlueprint}
							<button
								onclick={(e) => {
									e.stopPropagation();
									onRemoveBlueprint(blueprint);
								}}
								class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white p-2 rounded transition-colors"
								title="Remove blueprint definition"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if blueprints.length === 0}
		<div class="table-empty">No blueprints found</div>
	{/if}
</div>

<script lang="ts">
	import type { Blueprint, BlueprintDefinition } from '$lib/types/blueprint';

	interface Props {
		blueprints: (Blueprint | BlueprintDefinition)[];
		showDefinitionColumns?: boolean; // Show Group/Version/Scope columns for definitions
		onBlueprintClick?: (blueprint: Blueprint | BlueprintDefinition) => void;
		onRemoveBlueprint?: (blueprint: Blueprint | BlueprintDefinition) => void;
		loading?: boolean; // Show loading state instead of "not found" message
	}

	let { blueprints, showDefinitionColumns = true, onBlueprintClick, onRemoveBlueprint, loading = false }: Props = $props();

	function formatDate(dateString?: string): string {
		if (!dateString || dateString === '0001-01-01T00:00:00Z') {
			return 'Never';
		}
		return new Date(dateString).toLocaleString();
	}

	function getKindColor(kind: string): string {
		const colorPalette = [
			'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
			'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
			'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900',
			'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900',
			'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900',
			'text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900',
			'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900',
			'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900'
		];

		// Simple hash function
		let hash = 0;
		const str = kind.toLowerCase();
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash;
		}

		const index = Math.abs(hash) % colorPalette.length;
		return colorPalette[index];
	}
</script>

<div class="table-container">
	<table class="table-base">
		<thead class="table-header">
			<tr>
				<th scope="col" class="table-header-cell">
					Name
				</th>
				<th scope="col" class="table-header-cell">
					Kind
				</th>
				<th scope="col" class="table-header-cell">
					Colony
				</th>
				{#if showDefinitionColumns}
					<th scope="col" class="table-header-cell">
						Group
					</th>
					<th scope="col" class="table-header-cell">
						Version
					</th>
					<th scope="col" class="table-header-cell">
						Scope
					</th>
				{:else}
					<th scope="col" class="table-header-cell">
						Replicas
					</th>
					<th scope="col" class="table-header-cell">
						Last Reconciliation
					</th>
				{/if}
				<th scope="col" class="table-header-cell">
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

					{#if showDefinitionColumns}
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
					{:else}
						<!-- Replicas (from spec.replicas) -->
						<td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 dark:text-slate-100">
							{(blueprint.spec as any)?.replicas !== undefined ? (blueprint.spec as any).replicas : '-'}
						</td>

						<!-- Last Reconciliation Time -->
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
							{formatDate(blueprint.metadata.lastReconciliationTime)}
						</td>
					{/if}

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
		<div class="table-empty">
			{#if loading}
				{showDefinitionColumns ? 'Loading blueprint definitions...' : 'Loading blueprints...'}
			{:else}
				{showDefinitionColumns ? 'No blueprint definitions found' : 'No blueprints found'}
			{/if}
		</div>
	{/if}
</div>

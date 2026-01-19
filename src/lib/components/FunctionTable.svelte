<script lang="ts">
  import type { Function } from "$lib/types/function";
  import { formatDuration } from "$lib/types/function";

  interface Props {
    functions: Function[];
    loading?: boolean;
  }

  let { functions, loading = false }: Props = $props();
</script>

<div class="table-container">
  <table class="table-base">
    <thead class="table-header">
      <tr>
        <th scope="col" class="table-header-cell"> Function </th>
        <th scope="col" class="table-header-cell text-center"> Executions </th>
        <th scope="col" class="table-header-cell"> Wait Time </th>
        <th scope="col" class="table-header-cell"> Execution Time </th>
      </tr>
    </thead>
    <tbody class="table-body">
      {#each functions as func (func.functionid)}
        <tr class="table-row dark:hover:bg-slate-600">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex flex-col">
              <div
                class="text-sm font-medium text-gray-900 dark:text-slate-100"
              >
                {func.funcname}
              </div>
              <div class="text-xs text-gray-500 dark:text-slate-300">
                {func.functionid}
              </div>
              <div class="text-xs text-gray-400 dark:text-slate-400">
                {func.colonyname}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <span class="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {func.counter.toLocaleString()}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-slate-300">Avg:</span>
                <span class="font-medium text-gray-900 dark:text-slate-100">
                  {formatDuration(func.avgwaittime)}
                </span>
              </div>
              <div
                class="flex justify-between text-xs text-gray-400 dark:text-slate-400"
              >
                <span>Min: {formatDuration(func.minwaittime)}</span>
                <span>Max: {formatDuration(func.maxwaittime)}</span>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-slate-300">Avg:</span>
                <span class="font-medium text-gray-900 dark:text-slate-100">
                  {formatDuration(func.avgexectime)}
                </span>
              </div>
              <div
                class="flex justify-between text-xs text-gray-400 dark:text-slate-400"
              >
                <span>Min: {formatDuration(func.minexectime)}</span>
                <span>Max: {formatDuration(func.maxexectime)}</span>
              </div>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if functions.length === 0}
    <div class="table-empty">
      {#if loading}
        Loading functions...
      {:else}
        No functions found
      {/if}
    </div>
  {/if}
</div>

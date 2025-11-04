<script lang="ts">
  import type { Function } from "$lib/types/function";
  import { formatDuration, getPerformanceColor } from "$lib/types/function";

  interface Props {
    functions: Function[];
  }

  let { functions }: Props = $props();

  function getThroughputColor(counter: number): string {
    if (counter >= 1000)
      return "text-green-600 dark:text-green-400 font-semibold";
    if (counter >= 100) return "text-blue-600 dark:text-blue-400 font-medium";
    if (counter >= 10) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-slate-300";
  }
</script>

<div class="table-container">
  <table class="table-base">
    <thead class="table-header">
      <tr>
        <th class="table-header-cell"> Function </th>
        <th class="table-header-cell text-center"> Executions </th>
        <th class="table-header-cell"> Wait Time </th>
        <th class="table-header-cell"> Execution Time </th>
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
            <span class="text-2xl font-bold {getThroughputColor(func.counter)}">
              {func.counter.toLocaleString()}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-slate-300">Avg:</span>
                <span
                  class="font-medium {getPerformanceColor(
                    func.avgwaittime,
                    func.minwaittime,
                    func.maxwaittime,
                  )}"
                >
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
                <span
                  class="font-medium {getPerformanceColor(
                    func.avgexectime,
                    func.minexectime,
                    func.maxexectime,
                  )}"
                >
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
    <div class="text-center py-8 text-gray-500 dark:text-slate-300">
      No functions found
    </div>
  {/if}
</div>

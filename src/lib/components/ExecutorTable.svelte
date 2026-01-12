<script lang="ts">
  import type { Executor } from "$lib/types/executor";
  import {
    getExecutorStateLabel,
    getExecutorStateColor,
  } from "$lib/types/executor";

  interface Props {
    executors: Executor[];
    onExecutorClick?: (executor: Executor) => void;
    loading?: boolean;
  }

  let { executors, onExecutorClick, loading = false }: Props = $props();

  type SortColumn = "name" | "status" | null;
  type SortDirection = "asc" | "desc";

  let sortColumn = $state<SortColumn>(null);
  let sortDirection = $state<SortDirection>("asc");
  let searchTerm = $state("");

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column;
      sortDirection = "asc";
    }
  }

  let filteredAndSortedExecutors = $derived.by(() => {
    let result = executors;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) =>
        e.executorname.toLowerCase().includes(term),
      );
    }

    // Sort if needed
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        if (sortColumn === "name") {
          comparison = a.executorname.localeCompare(b.executorname);
        } else if (sortColumn === "status") {
          comparison = (a.state ?? 0) - (b.state ?? 0);
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  });

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
</script>

<div class="mb-4">
  <input
    type="text"
    placeholder="Filter by name"
    bind:value={searchTerm}
    class="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>

<div class="table-container">
  <table class="table-base">
    <thead class="table-header">
      <tr>
        <th scope="col"
          class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500 select-none"
          onclick={() => toggleSort("name")}
        >
          <div class="flex items-center gap-1">
            Executor
            {#if sortColumn === "name"}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d={sortDirection === "asc"
                    ? "M5 15l7-7 7 7"
                    : "M19 9l-7 7-7-7"}
                />
              </svg>
            {/if}
          </div>
        </th>
        <th scope="col"
          class="table-header-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-500 select-none"
          onclick={() => toggleSort("status")}
        >
          <div class="flex items-center gap-1">
            Status
            {#if sortColumn === "status"}
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d={sortDirection === "asc"
                    ? "M5 15l7-7 7 7"
                    : "M19 9l-7 7-7-7"}
                />
              </svg>
            {/if}
          </div>
        </th>
        <th scope="col" class="table-header-cell"> Hardware </th>
        <th scope="col" class="table-header-cell"> Last Heard </th>
      </tr>
    </thead>
    <tbody class="table-body">
      {#each filteredAndSortedExecutors as executor (executor.executorid)}
        {@const hw = executor.capabilities?.hardware}
        {@const hasNodes = hw?.nodes}
        {@const hasCpu = hw?.cpu && hw.cpu !== ""}
        {@const hasMem = hw?.mem && hw.mem !== ""}
        {@const hasStorage = hw?.storage && hw.storage !== ""}
        <tr
          class="table-row {onExecutorClick ? 'cursor-pointer' : ''}"
          onclick={() => onExecutorClick?.(executor)}
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex flex-col">
              <div
                class="text-sm font-medium text-gray-900 dark:text-slate-100"
              >
                {executor.executorname}
              </div>
              <div class="text-sm text-gray-500 dark:text-slate-300">
                {executor.executorid}
              </div>
              <div class="text-xs text-gray-400 dark:text-slate-400">
                {executor.executortype}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span
              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getExecutorStateColor(
                executor.state,
              )}"
            >
              {getExecutorStateLabel(executor.state)}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900 dark:text-slate-100">
              {#if hw?.model && hw.model !== ""}
                <div>{hw.model}</div>
              {/if}
              {#if hasNodes || hasCpu}
                <div class="text-xs text-gray-500 dark:text-slate-300">
                  {#if hasNodes}{hw.nodes} nodes{/if}{#if hasNodes && hasCpu}
                    •
                  {/if}{#if hasCpu}{hw.cpu}{/if}
                </div>
              {/if}
              {#if hasMem || hasStorage}
                <div class="text-xs text-gray-500 dark:text-slate-300">
                  {#if hasMem}RAM: {hw.mem}{/if}{#if hasMem && hasStorage}
                    •
                  {/if}{#if hasStorage}Storage: {hw.storage}{/if}
                </div>
              {/if}
              {#if hw?.gpu?.count && hw.gpu.count > 0}
                <div class="text-xs text-gray-500 dark:text-slate-300">
                  GPU: {hw.gpu.count}x {hw.gpu.name} • VRAM: {hw.gpu.mem}
                </div>
              {/if}
            </div>
          </td>
          <td
            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100"
          >
            {formatDate(executor.lastheardfromtime)}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if executors.length === 0}
    <div class="table-empty">
      {#if loading}
        Loading executors...
      {:else}
        No executors found
      {/if}
    </div>
  {/if}
</div>


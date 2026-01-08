<script lang="ts">
  import { onMount } from "svelte";
  import FunctionTable from "$lib/components/FunctionTable.svelte";
  import { appState } from "$lib/stores/appState";
  import { envConfig } from "$lib/config/env";
  import type { ColonyClient } from "$lib/api/colony";
  import {
    convertApiFunction,
    type ApiFunctionResponse,
    type Function,
  } from "$lib/types/function";
  import ClientFactory from "$lib/utils/clientFactory";

  interface Executor {
    executorid: string;
    executorname: string;
    colonyname: string;
  }

  let loadingStatus = $state<"idle" | "loading" | "success" | "error">("idle");
  let loadingError = $state("");
  let executors = $state<Executor[]>([]);
  let allFunctions = $state<Function[]>([]);
  let userClient = $state<ColonyClient | null>(null); // Client with colony private key
  let expandedExecutors = $state<Record<string, boolean>>({}); // Track which executors are expanded
  let searchTerm = $state("");

  onMount(async () => {
    userClient = await ClientFactory.getColonyClient();
    await loadFunctionData();
  });

  async function loadFunctionData() {
    if (!userClient) {
      loadingError = "Client not initialized. Check configuration.";
      loadingStatus = "error";
      return;
    }

    loadingStatus = "loading";
    loadingError = "";
    allFunctions = [];

    try {
      // Use colony name from environment variables
      const colonyName = $appState.colonyName || envConfig.colonyName;
      if (!colonyName) {
        loadingError = "Colony name not configured in environment variables.";
        loadingStatus = "error";
        return;
      }

      // Get executors for the specific colony using colony private key
      const colonyExecutors = await userClient.getExecutors(colonyName);
      if (Array.isArray(colonyExecutors)) {
        executors = colonyExecutors.map((e) => ({
          executorid: e.executorid,
          executorname: e.executorname || e.executorid,
          colonyname: colonyName,
        }));

        // Get functions for each executor
        const functionPromises = executors.map(async (executor) => {
          try {
            const functions = await userClient!.getFunctions(
              executor.executorname,
              executor.colonyname,
            );
            if (Array.isArray(functions)) {
              return functions.map((f: ApiFunctionResponse) =>
                convertApiFunction(f),
              );
            }
            return [];
          } catch (error) {
            console.warn(
              `Failed to get functions for ${executor.executorname}:`,
              error,
            );
            return [];
          }
        });

        const functionArrays = await Promise.all(functionPromises);
        allFunctions = functionArrays.flat();
        loadingStatus = "success";
      } else {
        loadingError = "Failed to load executors";
        loadingStatus = "error";
      }
    } catch (error) {
      console.error("Failed to load function data:", error);
      loadingError = error instanceof Error ? error.message : String(error);
      loadingStatus = "error";
    }
  }

  // Filter functions based on search term
  let filteredFunctions = $derived(
    allFunctions.filter(func =>
      searchTerm === "" ||
      func.funcname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.functionid.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Group filtered functions by executor
  let groupedFunctions = $derived.by(() => {
    return filteredFunctions.reduce(
      (groups, func) => {
        const executorName = func.executorname || "unknown";
        if (!groups[executorName]) {
          groups[executorName] = [];
        }
        groups[executorName].push(func);
        return groups;
      },
      {} as Record<string, Function[]>,
    );
  });

  // Initialize expanded state for new executors using $effect
  $effect(() => {
    Object.keys(groupedFunctions).forEach((executorName) => {
      if (!(executorName in expandedExecutors)) {
        expandedExecutors[executorName] = true;
      }
    });
  });

  function toggleExecutor(executorName: string) {
    expandedExecutors[executorName] = !expandedExecutors[executorName];
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="page-title">Functions</h1>
  </div>

  <!-- Error State -->
  {#if loadingStatus === "error"}
    <div
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4"
    >
      <strong>Error:</strong>
      {loadingError}
    </div>
  {/if}

  <!-- Controls (always visible) -->
  <div class="flex justify-between items-center mb-4">
    <!-- Search Filter -->
    <div class="flex items-center gap-2">
      <svg
        class="w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        disabled={loadingStatus === "loading"}
        placeholder="Filter by function name or ID..."
        class="w-80 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {#if searchTerm}
        <button
          onclick={() => (searchTerm = "")}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
          title="Clear filter"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      {/if}
    </div>

    <!-- Refresh Button -->
    <button
      onclick={loadFunctionData}
      disabled={loadingStatus === "loading"}
      aria-label="Refresh"
      class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
      title="Refresh"
    >
      {#if loadingStatus === "loading"}
        <svg
          class="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      {:else}
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      {/if}
    </button>
  </div>

  <!-- Function Tables Grouped by Executor (always visible) -->
  {#if Object.entries(groupedFunctions).length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-slate-300">
      {#if loadingStatus === "loading"}
        Loading functions...
      {:else if searchTerm}
        No functions match the filter "{searchTerm}"
      {:else}
        No functions found
      {/if}
    </div>
  {:else}
    {#each Object.entries(groupedFunctions) as [executorName, functions] (executorName)}
      <div
        class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 mb-4"
      >
        <button
          onclick={() => toggleExecutor(executorName)}
          class="w-full px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600 hover:bg-gray-100 dark:hover:bg-slate-500 transition-colors"
        >
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <svg
                class="w-5 h-5 text-gray-600 dark:text-slate-300 transition-transform {expandedExecutors[
                  executorName
                ]
                  ? 'rotate-90'
                  : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white text-left"
              >
                {executorName}
              </h3>
            </div>
            <span class="text-sm text-gray-500 dark:text-slate-400">
              {functions.length}
              {functions.length === 1 ? "function" : "functions"}
            </span>
          </div>
        </button>
        {#if expandedExecutors[executorName]}
          <FunctionTable {functions} loading={loadingStatus === 'loading'} />
        {/if}
      </div>
    {/each}
  {/if}
</div>

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

  // Group functions by executor
  let groupedFunctions = $derived.by(() => {
    return allFunctions.reduce(
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
</script>

<div class="space-y-6">
  <div>
    <h1 class="page-title">Functions</h1>
  </div>

  <!-- Loading/Error States -->
  {#if loadingStatus === "loading"}
    <div class="flex items-center justify-center py-4 text-gray-500">
      <div
        class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"
      ></div>
      Loading function data...
    </div>
  {:else if loadingStatus === "error"}
    <div
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4"
    >
      <strong>Error:</strong>
      {loadingError}
    </div>
  {:else}
    <div class="flex justify-end mb-4">
      <!-- Refresh Button -->
      <button
        onclick={loadFunctionData}
        disabled={loadingStatus === "loading"}
        aria-label="Refresh"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
        title="Refresh"
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>

    <!-- Function Tables Grouped by Executor -->
    {#if Object.entries(groupedFunctions).length === 0}
      <div class="text-center py-8 text-gray-500 dark:text-slate-300">
        No functions found
      </div>
    {:else}
      {#each Object.entries(groupedFunctions) as [executorName, functions] (executorName)}
        <div
          class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 mb-4"
        >
          <div
            class="px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600"
          >
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {executorName}
                </h3>
                <p class="text-sm text-gray-600 dark:text-slate-300">
                  {functions.length} function{functions.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          <FunctionTable {functions} />
        </div>
      {/each}
    {/if}
  {/if}
</div>


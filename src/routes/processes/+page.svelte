<script lang="ts">
  import { onMount } from "svelte";
  import ProcessTable from "$lib/components/ProcessTable.svelte";
  import ProcessDetailsModal from "$lib/components/ProcessDetailsModal.svelte";
  import SubmitProcessModal from "$lib/components/SubmitProcessModal.svelte";
  import { ProcessState, type Process } from "$lib/types/process";
  import { appState } from "$lib/stores/appState";
  import { envConfig } from "$lib/config/env";
  import { ColonyClient, PROCESS_STATE_NOTSET } from "$lib/api/colony";
  import Crypto from "$lib/crypto/crypto.js";

  interface Colony {
    colonyid: string;
    name: string;
  }

  // Load initial filter state from localStorage
  function getInitialFilterState() {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("processFilterState");
      if (savedState) {
        try {
          return JSON.parse(savedState);
        } catch (e) {
          console.error("Failed to parse saved filter state:", e);
        }
      }
    }
    return {
      selectedState: "",
      groupByWorkflow: false,
    };
  }

  const initialState = getInitialFilterState();

  let loadingStatus = $state<"idle" | "loading" | "success" | "error">("idle");
  let loadingError = $state("");
  let colonies = $state<Colony[]>([]);
  let allProcesses = $state<Process[]>([]);
  let selectedState = $state<number | "">(initialState.selectedState);
  let groupByWorkflow = $state(initialState.groupByWorkflow);
  let crypto: Crypto;
  let serverClient: ColonyClient | null = null;
  let colonyClient: ColonyClient | null = null;
  let processClient: ColonyClient | null = null; // For getProcess calls

  // Remove processes dialog state
  let showRemoveDialog = $state(false);
  let removingStatus = $state<"idle" | "removing" | "success" | "error">(
    "idle",
  );
  let removeError = $state("");
  let removeState = $state<number | "">("");

  // Process details modal state
  let showProcessModal = $state(false);
  let selectedProcess = $state<Process | null>(null);

  // Submit process modal state
  let showSubmitModal = $state(false);

  // We'll work with the first colony available or a default colony name
  let targetColony = $state("default-colony");

  function handleProcessClick(process: Process) {
    selectedProcess = process;
    showProcessModal = true;
  }

  function closeProcessModal() {
    showProcessModal = false;
    selectedProcess = null;
  }

  function openSubmitModal() {
    showSubmitModal = true;
  }

  function closeSubmitModal() {
    showSubmitModal = false;
  }

  function handleProcessSubmitted() {
    // Refresh the process data after submission
    loadProcessData();
  }

  function handleProcessDeleted() {
    // Refresh the process data to reflect the deletion
    loadProcessData();
  }

  function filterByState(state: number | "") {
    selectedState = state;
  }

  const stateOptions = [
    { value: ProcessState.WAITING, label: "Waiting" },
    { value: ProcessState.RUNNING, label: "Running" },
    { value: ProcessState.SUCCESS, label: "Success" },
    { value: ProcessState.FAILED, label: "Failed" },
  ];

  // Save filter state to localStorage whenever it changes
  $effect(() => {
    if (typeof window !== "undefined") {
      const filterState = {
        selectedState,
        groupByWorkflow,
      };
      localStorage.setItem("processFilterState", JSON.stringify(filterState));
    }
  });

  onMount(async () => {
    crypto = new Crypto();
    await crypto.load();

    const host = $appState.host || envConfig.host;
    const port = $appState.port || envConfig.port;
    const tls = ($appState.tls || envConfig.tls) === "true";

    if (host && port) {
      const endpoint = { host, port };

      serverClient = new ColonyClient(endpoint, crypto, tls);
      const serverPrivateKey = $appState.serverPrvKey || envConfig.serverPrvKey;
      if (serverPrivateKey) {
        serverClient.setPrivateKey(serverPrivateKey, "server");
      }

      colonyClient = new ColonyClient(endpoint, crypto, tls);
      const colonyPrivateKey = $appState.colonyPrvKey || envConfig.colonyPrvKey;
      if (colonyPrivateKey) {
        colonyClient.setPrivateKey(colonyPrivateKey, "colony");
      }

      // Set up a separate client for getProcess calls with general private key
      processClient = new ColonyClient(endpoint, crypto, tls);
      const generalPrivateKey =
        $appState.prvKey || envConfig.prvKey || colonyPrivateKey;
      if (generalPrivateKey) {
        console.log("Setting up processClient with general private key");
        processClient.setPrivateKey(generalPrivateKey, "general");
      } else {
        console.warn("No general private key available for getProcess calls");
      }

      await loadProcessData();
    }
  });

  async function loadProcessData() {
    if (!serverClient || !colonyClient) {
      loadingError = "Clients not initialized. Check configuration.";
      loadingStatus = "error";
      return;
    }

    loadingStatus = "loading";
    loadingError = "";
    allProcesses = [];

    try {
      const coloniesResult = await serverClient.getColonies();
      if (Array.isArray(coloniesResult)) {
        colonies = coloniesResult;

        // Set target colony to the first available colony
        if (colonies.length > 0) {
          targetColony = colonies[0].name;
        }

        // Load processes for each colony and each state
        const processPromises = colonies.flatMap((colony) =>
          stateOptions.map(async (stateOption) => {
            try {
              const processes = await colonyClient!.getProcesses(
                colony.name,
                100,
                stateOption.value,
              );
              return Array.isArray(processes) ? processes : [];
            } catch (error) {
              console.warn(
                `Failed to get processes for ${colony.name} state ${stateOption.label}:`,
                error,
              );
              return [];
            }
          }),
        );

        const processArrays = await Promise.all(processPromises);
        allProcesses = processArrays.flat();
        loadingStatus = "success";
      } else {
        loadingError = "Failed to load colonies";
        loadingStatus = "error";
      }
    } catch (error) {
      console.error("Failed to load process data:", error);
      loadingError = error instanceof Error ? error.message : String(error);
      loadingStatus = "error";
    }
  }

  let filteredProcesses = $derived.by(() => {
    return allProcesses.filter((p) => {
      const stateMatch =
        selectedState !== "" ? p.state === selectedState : true;
      return stateMatch;
    });
  });

  // Group processes by workflow if enabled
  let groupedProcesses = $derived.by(() => {
    if (groupByWorkflow) {
      return filteredProcesses.reduce(
        (groups, process) => {
          const workflowId = process.processgraphid || "no-workflow";
          if (!groups[workflowId]) {
            groups[workflowId] = [];
          }
          groups[workflowId].push(process);
          return groups;
        },
        {} as Record<string, Process[]>,
      );
    }
    return { all: filteredProcesses };
  });

  function openRemoveDialog() {
    showRemoveDialog = true;
    removeState = selectedState;
    removingStatus = "idle";
    removeError = "";
  }

  function closeRemoveDialog() {
    showRemoveDialog = false;
    removeState = "";
    removingStatus = "idle";
    removeError = "";
  }

  async function confirmRemoveAllProcesses() {
    if (!colonyClient) {
      removeError = "Colony client not initialized";
      removingStatus = "error";
      return;
    }

    removingStatus = "removing";
    removeError = "";

    try {
      const targetState =
        removeState !== "" ? Number(removeState) : PROCESS_STATE_NOTSET;

      if (!targetColony) {
        throw new Error("No colony available for removal");
      }

      await colonyClient.removeAllProcesses(targetColony, targetState);

      removingStatus = "success";
      const timeoutId = setTimeout(() => {
        closeRemoveDialog();
        loadProcessData(); // Refresh the data
      }, 1500);

      // Store timeout ID for potential cleanup
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Failed to remove processes:", error);
      removeError = error instanceof Error ? error.message : String(error);
      removingStatus = "error";
    }
  }

  function getRemovalDescription(): string {
    const colony = targetColony || "current colony";
    const state =
      removeState !== ""
        ? stateOptions.find((s) => s.value === Number(removeState))?.label ||
          "unknown state"
        : "all states";
    return `Remove all processes from ${colony} with state: ${state}`;
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="page-title">Processes</h1>
  </div>

  <div
    class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-4"
  >
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        Process Overview
      </h2>

      <div class="flex items-center gap-4">
        <!-- Group by Workflow Toggle -->
        <label class="flex items-center text-sm text-gray-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={groupByWorkflow} class="mr-2" />
          Group by Workflow
        </label>

        <!-- Submit Process Button -->
        <button
          onclick={openSubmitModal}
          disabled={loadingStatus === "loading" || !colonyClient}
          class="text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors flex items-center"
        >
          <svg
            class="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Submit Process
        </button>

        <!-- Remove All Button -->
        <button
          onclick={openRemoveDialog}
          disabled={loadingStatus === "loading" || !colonyClient}
          class="text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
        >
          Remove All
        </button>

        <!-- Refresh Button -->
        <button
          onclick={loadProcessData}
          disabled={loadingStatus === "loading"}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-2 rounded transition-colors"
          title="Refresh"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading/Error States -->
    {#if loadingStatus === "loading"}
      <div class="flex items-center justify-center py-4 text-gray-500">
        <div
          class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"
        ></div>
        Loading process data...
      </div>
    {:else if loadingStatus === "error"}
      <div
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4"
      >
        <strong>Error:</strong>
        {loadingError}
      </div>
    {:else}
      <!-- Statistics -->
      <div class="flex space-x-4 text-sm mb-4">
        <button
          onclick={() => filterByState(ProcessState.RUNNING)}
          class:bg-blue-600={selectedState === ProcessState.RUNNING}
          class:text-white={selectedState === ProcessState.RUNNING}
          class:ring-2={selectedState === ProcessState.RUNNING}
          class:ring-blue-400={selectedState === ProcessState.RUNNING}
          class="flex items-center hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
        >
          <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span
            >Running: {allProcesses.filter(
              (p) => p.state === ProcessState.RUNNING,
            ).length}</span
          >
        </button>
        <button
          onclick={() => filterByState(ProcessState.WAITING)}
          class:bg-yellow-600={selectedState === ProcessState.WAITING}
          class:text-white={selectedState === ProcessState.WAITING}
          class:ring-2={selectedState === ProcessState.WAITING}
          class:ring-yellow-400={selectedState === ProcessState.WAITING}
          class="flex items-center hover:bg-yellow-50 px-2 py-1 rounded transition-colors cursor-pointer"
        >
          <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
          <span
            >Waiting: {allProcesses.filter(
              (p) => p.state === ProcessState.WAITING,
            ).length}</span
          >
        </button>
        <button
          onclick={() => filterByState(ProcessState.SUCCESS)}
          class:bg-green-600={selectedState === ProcessState.SUCCESS}
          class:text-white={selectedState === ProcessState.SUCCESS}
          class:ring-2={selectedState === ProcessState.SUCCESS}
          class:ring-green-400={selectedState === ProcessState.SUCCESS}
          class="flex items-center hover:bg-green-50 px-2 py-1 rounded transition-colors cursor-pointer"
        >
          <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span
            >Success: {allProcesses.filter(
              (p) => p.state === ProcessState.SUCCESS,
            ).length}</span
          >
        </button>
        <button
          onclick={() => filterByState(ProcessState.FAILED)}
          class:bg-red-600={selectedState === ProcessState.FAILED}
          class:text-white={selectedState === ProcessState.FAILED}
          class:ring-2={selectedState === ProcessState.FAILED}
          class:ring-red-400={selectedState === ProcessState.FAILED}
          class="flex items-center hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
        >
          <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          <span
            >Failed: {allProcesses.filter(
              (p) => p.state === ProcessState.FAILED,
            ).length}</span
          >
        </button>
        <button
          onclick={() => filterByState("")}
          class:bg-purple-600={selectedState === ""}
          class:text-white={selectedState === ""}
          class:ring-2={selectedState === ""}
          class:ring-purple-400={selectedState === ""}
          class="flex items-center hover:bg-purple-50 px-2 py-1 rounded transition-colors cursor-pointer"
        >
          <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
          <span>Total: {allProcesses.length}</span>
        </button>
      </div>

      <!-- Process Tables (Grouped or Single) -->
      {#if groupByWorkflow}
        {#each Object.entries(groupedProcesses) as [workflowId, processes]}
          <div
            class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 mb-4"
          >
            <div
              class="px-6 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600"
            >
              <div class="flex justify-between items-center">
                <div>
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {#if workflowId === "no-workflow"}
                      Individual Processes
                    {:else}
                      Workflow: {workflowId}
                    {/if}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-slate-300">
                    {processes.length} process{processes.length === 1
                      ? ""
                      : "es"}
                  </p>
                </div>
                {#if workflowId !== "no-workflow"}
                  <div class="text-xs text-gray-500 dark:text-slate-300">
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs"
                      >
                        Workflow
                      </span>
                      <span
                        >Dependencies: {processes.filter(
                          (p) => p.parents.length > 0,
                        ).length} processes</span
                      >
                    </div>
                  </div>
                {/if}
              </div>
            </div>
            <ProcessTable {processes} onProcessClick={handleProcessClick} />
          </div>
        {/each}
      {:else}
        <ProcessTable
          processes={filteredProcesses}
          onProcessClick={handleProcessClick}
        />
      {/if}
    {/if}
  </div>
</div>

<!-- Remove All Processes Confirmation Dialog -->
{#if showRemoveDialog}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white dark:bg-slate-700 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
    >
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Confirm Process Removal
        </h3>
        <p class="text-gray-600 dark:text-slate-300 mb-4">
          This action will permanently remove processes and cannot be undone.
        </p>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Action:</strong>
            {getRemovalDescription()}
          </p>
        </div>
      </div>

      <!-- State Selection -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >Process State</label
        >
        <select
          bind:value={removeState}
          class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-600 text-gray-900 dark:text-white"
        >
          <option value="">All States</option>
          {#each stateOptions as state}
            <option value={state.value}>{state.label}</option>
          {/each}
        </select>
      </div>

      <!-- Error Display -->
      {#if removingStatus === "error"}
        <div
          class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4"
        >
          <strong>Error:</strong>
          {removeError}
        </div>
      {/if}

      <!-- Success Display -->
      {#if removingStatus === "success"}
        <div
          class="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-4"
        >
          <strong>Success:</strong> Processes removed successfully
        </div>
      {/if}

      <!-- Dialog Actions -->
      <div class="flex justify-end space-x-3">
        <button
          onclick={closeRemoveDialog}
          disabled={removingStatus === "removing"}
          class="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 dark:bg-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onclick={confirmRemoveAllProcesses}
          disabled={removingStatus === "removing" ||
            removingStatus === "success"}
          class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded transition-colors"
        >
          {#if removingStatus === "removing"}
            <div class="flex items-center">
              <div
                class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              ></div>
              Removing...
            </div>
          {:else}
            Remove All Processes
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Process Details Modal -->
<ProcessDetailsModal
  show={showProcessModal}
  process={selectedProcess}
  client={processClient}
  onClose={closeProcessModal}
  onProcessDeleted={handleProcessDeleted}
/>

<!-- Submit Process Modal -->
<SubmitProcessModal
  show={showSubmitModal}
  client={colonyClient}
  onClose={closeSubmitModal}
  onProcessSubmitted={handleProcessSubmitted}
/>


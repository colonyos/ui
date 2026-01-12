<script lang="ts">
  import type { Executor } from "$lib/types/executor";
  import { ColonyClient } from "$lib/api/colony";

  interface Props {
    show: boolean;
    executor: Executor | null;
    client: ColonyClient | null;
    onClose: () => void;
  }

  let { show, executor, client, onClose }: Props = $props();

  interface ExecutorDetails {
    executorid?: string;
    executorname?: string;
    executortype?: string;
    colonyname?: string;
    state?: number;
    commissiontime?: string;
    lastheardfromtime?: string;
    location?: {
      long: number;
      lat: number;
      desc: string;
    };
    capabilities?: {
      hardware?: {
        model: string;
        nodes: number;
        cpu: string;
        mem: string;
        storage: string;
        gpu?: {
          name: string;
          mem: string;
          count: number;
          nodecount: number;
        };
      };
      software?: {
        name: string;
        type: string;
        version: string;
      };
    };
    allocations?: {
      projects: any;
    };
  }

  let loadingStatus: "idle" | "loading" | "success" | "error" = $state("idle");
  let loadingError = $state("");
  let executorDetails: ExecutorDetails | null = $state(null);
  let executorFunctions: any[] = $state([]);
  let functionsLoadingStatus: "idle" | "loading" | "success" | "error" =
    $state("idle");
  let functionsError = $state("");

  $effect(() => {
    if (show && executor && client) {
      loadExecutorDetails();
      loadExecutorFunctions();
    }
  });

  async function loadExecutorDetails() {
    if (!executor || !client) return;

    loadingStatus = "loading";
    loadingError = "";
    executorDetails = null;

    try {
      // Get the colony name from the executor object
      // It should be passed from the parent component
      const colonyName =
        (executor as any).colonyname || executor.colonyid || "default";

      const result = await client.getExecutor(
        colonyName,
        executor.executorname,
      );
      executorDetails = result;
      loadingStatus = "success";
    } catch (error) {
      console.error("Failed to load executor details:", error);
      loadingError = error instanceof Error ? error.message : String(error);
      loadingStatus = "error";
      // Fall back to showing the basic executor info we already have
      executorDetails = executor as ExecutorDetails;
    }
  }

  async function loadExecutorFunctions() {
    if (!executor || !client) return;

    functionsLoadingStatus = "loading";
    functionsError = "";
    executorFunctions = [];

    try {
      // Get the colony name from the executor object
      const colonyName =
        (executor as any).colonyname || executor.colonyid || "default";

      const result = await client.getFunctionsForExecutor(
        colonyName,
        executor.executorname,
      );
      executorFunctions = Array.isArray(result) ? result : [];
      functionsLoadingStatus = "success";
    } catch (error) {
      console.error("Failed to load executor functions:", error);
      functionsError = error instanceof Error ? error.message : String(error);
      functionsLoadingStatus = "error";
    }
  }

  function getStateLabel(state: number | undefined): string {
    switch (state) {
      case 0:
        return "Pending";
      case 1:
        return "Approved";
      case 2:
        return "Rejected";
      default:
        return "Unknown";
    }
  }

  function getStateColor(state: number | undefined): string {
    switch (state) {
      case 0:
        return "text-yellow-600 bg-yellow-100";
      case 1:
        return "text-green-600 bg-green-100";
      case 2:
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function hasHardwareData(hardware: any): boolean {
    if (!hardware) return false;

    // Check if any meaningful hardware data exists
    const hasModel = hardware.model && hardware.model !== "";
    const hasNodes = hardware.nodes && hardware.nodes > 0;
    const hasCpu = hardware.cpu && hardware.cpu !== "";
    const hasMem = hardware.mem && hardware.mem !== "";
    const hasStorage = hardware.storage && hardware.storage !== "";
    const hasGpu = hardware.gpu && hardware.gpu.count > 0;

    return hasModel || hasNodes || hasCpu || hasMem || hasStorage || hasGpu;
  }

  function hasSoftwareData(software: any): boolean {
    if (!software) return false;

    // Check if any meaningful software data exists
    const hasName = software.name && software.name !== "";
    const hasType = software.type && software.type !== "";
    const hasVersion = software.version && software.version !== "";

    return hasName || hasType || hasVersion;
  }

  function hasLocationData(location: any): boolean {
    if (!location) return false;

    // Check if any meaningful location data exists
    const hasDesc = location.desc && location.desc !== "";
    const hasLat = location.lat && location.lat !== 0;
    const hasLong = location.long && location.long !== 0;

    return hasDesc || hasLat || hasLong;
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="executor-details-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === "Escape" && onClose()}
  >
    <div
      class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
        <div class="flex justify-between items-start">
          <div>
            <h3 id="executor-details-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Executor Details
            </h3>
            {#if executor}
              <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
                {executor.executorname}
              </p>
              <p class="text-xs text-gray-400 dark:text-slate-400 font-mono">
                {executor.executorid}
              </p>
            {/if}
          </div>
          <button
            onclick={onClose}
            aria-label="Close"
            class="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg
              class="w-6 h-6"
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
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
        {#if loadingStatus === "loading"}
          <div class="flex items-center justify-center py-8">
            <div
              class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3"
            ></div>
            <span class="text-gray-600 dark:text-slate-300"
              >Loading executor details...</span
            >
          </div>
        {:else if loadingStatus === "error" && !executorDetails}
          <div
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4"
          >
            <strong>Error:</strong>
            {loadingError}
          </div>
        {:else if executorDetails}
          <div class="space-y-6">
            <!-- Basic Information -->
            <div>
              <h4
                class="text-md font-medium text-gray-900 dark:text-white mb-3"
              >
                Basic Information
              </h4>
              <div
                class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 space-y-2"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Name:</span
                    >
                    <span class="text-gray-900 dark:text-white ml-2"
                      >{executorDetails.executorname}</span
                    >
                  </div>
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Type:</span
                    >
                    <span class="text-gray-900 dark:text-white ml-2"
                      >{executorDetails.executortype}</span
                    >
                  </div>
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Colony:</span
                    >
                    <span class="text-gray-900 dark:text-white ml-2"
                      >{executorDetails.colonyname}</span
                    >
                  </div>
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Status:</span
                    >
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 {getStateColor(
                        executorDetails.state,
                      )}"
                    >
                      {getStateLabel(executorDetails.state)}
                    </span>
                  </div>
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Commission Time:</span
                    >
                    <span class="text-gray-900 dark:text-white ml-2"
                      >{formatDate(executorDetails.commissiontime)}</span
                    >
                  </div>
                  <div>
                    <span class="font-medium text-gray-700 dark:text-slate-300"
                      >Last Heard From:</span
                    >
                    <span class="text-gray-900 dark:text-white ml-2"
                      >{formatDate(executorDetails.lastheardfromtime)}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Location -->
            {#if executorDetails.location && hasLocationData(executorDetails.location)}
              <div>
                <h4
                  class="text-md font-medium text-gray-900 dark:text-white mb-3"
                >
                  Location
                </h4>
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span class="font-medium text-blue-700 dark:text-blue-300"
                        >Description:</span
                      >
                      <span class="text-blue-900 dark:text-blue-100 ml-2"
                        >{executorDetails.location.desc ||
                          "Not specified"}</span
                      >
                    </div>
                    <div>
                      <span class="font-medium text-blue-700 dark:text-blue-300"
                        >Latitude:</span
                      >
                      <span class="text-blue-900 dark:text-blue-100 ml-2"
                        >{executorDetails.location.lat || "N/A"}</span
                      >
                    </div>
                    <div>
                      <span class="font-medium text-blue-700 dark:text-blue-300"
                        >Longitude:</span
                      >
                      <span class="text-blue-900 dark:text-blue-100 ml-2"
                        >{executorDetails.location.long || "N/A"}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Hardware Capabilities -->
            {#if executorDetails.capabilities?.hardware && hasHardwareData(executorDetails.capabilities.hardware)}
              <div>
                <h4
                  class="text-md font-medium text-gray-900 dark:text-white mb-3"
                >
                  Hardware Capabilities
                </h4>
                <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {#if executorDetails.capabilities.hardware.model && executorDetails.capabilities.hardware.model !== ""}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >Model:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2"
                          >{executorDetails.capabilities.hardware.model}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.hardware.nodes}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >Nodes:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2"
                          >{executorDetails.capabilities.hardware.nodes}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.hardware.cpu && executorDetails.capabilities.hardware.cpu !== ""}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >CPU:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2"
                          >{executorDetails.capabilities.hardware.cpu}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.hardware.mem && executorDetails.capabilities.hardware.mem !== ""}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >Memory:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2"
                          >{executorDetails.capabilities.hardware.mem}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.hardware.storage && executorDetails.capabilities.hardware.storage !== ""}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >Storage:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2"
                          >{executorDetails.capabilities.hardware.storage}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.hardware.gpu && executorDetails.capabilities.hardware.gpu.count > 0}
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >GPU:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2">
                          {executorDetails.capabilities.hardware.gpu.count}x {executorDetails
                            .capabilities.hardware.gpu.name}
                        </span>
                      </div>
                      <div>
                        <span
                          class="font-medium text-green-700 dark:text-green-300"
                          >Memory:</span
                        >
                        <span class="text-green-900 dark:text-green-100 ml-2">
                          {executorDetails.capabilities.hardware.gpu.mem} per GPU
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}

            <!-- Software Capabilities -->
            {#if executorDetails.capabilities?.software && hasSoftwareData(executorDetails.capabilities.software)}
              <div>
                <h4
                  class="text-md font-medium text-gray-900 dark:text-white mb-3"
                >
                  Software Capabilities
                </h4>
                <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {#if executorDetails.capabilities.software.name && executorDetails.capabilities.software.name !== ""}
                      <div>
                        <span
                          class="font-medium text-purple-700 dark:text-purple-300"
                          >Name:</span
                        >
                        <span class="text-purple-900 dark:text-purple-100 ml-2"
                          >{executorDetails.capabilities.software.name}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.software.type && executorDetails.capabilities.software.type !== ""}
                      <div>
                        <span
                          class="font-medium text-purple-700 dark:text-purple-300"
                          >Type:</span
                        >
                        <span class="text-purple-900 dark:text-purple-100 ml-2"
                          >{executorDetails.capabilities.software.type}</span
                        >
                      </div>
                    {/if}
                    {#if executorDetails.capabilities.software.version && executorDetails.capabilities.software.version !== ""}
                      <div>
                        <span
                          class="font-medium text-purple-700 dark:text-purple-300"
                          >Version:</span
                        >
                        <span class="text-purple-900 dark:text-purple-100 ml-2"
                          >{executorDetails.capabilities.software.version}</span
                        >
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}

            <!-- Project Allocations -->
            {#if executorDetails.allocations?.projects && Object.keys(executorDetails.allocations.projects).length > 0}
              <div>
                <h4
                  class="text-md font-medium text-gray-900 dark:text-white mb-3"
                >
                  Project Allocations
                </h4>
                <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <div class="text-sm">
                    <pre
                      class="text-yellow-900 dark:text-yellow-100 font-mono whitespace-pre-wrap">{JSON.stringify(
                        executorDetails.allocations.projects,
                        null,
                        2,
                      )}</pre>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Available Functions -->
            <div>
              <h4
                class="text-md font-medium text-gray-900 dark:text-white mb-3"
              >
                Available Functions
              </h4>
              {#if functionsLoadingStatus === "loading"}
                <div class="flex items-center justify-center py-4">
                  <div
                    class="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"
                  ></div>
                  <span class="text-gray-600 dark:text-slate-300 text-sm"
                    >Loading functions...</span
                  >
                </div>
              {:else if functionsLoadingStatus === "error"}
                <div
                  class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm"
                >
                  <strong>Error:</strong>
                  {functionsError}
                </div>
              {:else if functionsLoadingStatus === "success"}
                {#if executorFunctions.length > 0}
                  <div
                    class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-3"
                  >
                    {#each executorFunctions as func (func.functionid)}
                      <div
                        class="border border-indigo-200 dark:border-indigo-800 rounded p-3 bg-white dark:bg-slate-600"
                      >
                        <div class="space-y-3 text-sm">
                          <div>
                            <span
                              class="font-medium text-indigo-700 dark:text-indigo-300"
                              >Function Name:</span
                            >
                            <span
                              class="text-indigo-900 dark:text-indigo-100 ml-2"
                              >{func.funcname || "Unknown"}</span
                            >
                          </div>
                          <div>
                            <span
                              class="font-medium text-indigo-700 dark:text-indigo-300"
                              >Function ID:</span
                            >
                            <div
                              class="text-indigo-900 dark:text-indigo-100 font-mono text-xs mt-1 break-all bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded"
                            >
                              {func.functionid || "N/A"}
                            </div>
                          </div>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#if func.maxwaittime !== undefined}
                              <div>
                                <span
                                  class="font-medium text-indigo-700 dark:text-indigo-300"
                                  >Max Wait Time:</span
                                >
                                <span
                                  class="text-indigo-900 dark:text-indigo-100 ml-2"
                                  >{func.maxwaittime}s</span
                                >
                              </div>
                            {/if}
                            {#if func.maxexectime !== undefined}
                              <div>
                                <span
                                  class="font-medium text-indigo-700 dark:text-indigo-300"
                                  >Max Exec Time:</span
                                >
                                <span
                                  class="text-indigo-900 dark:text-indigo-100 ml-2"
                                  >{func.maxexectime}s</span
                                >
                              </div>
                            {/if}
                            {#if func.maxretries !== undefined}
                              <div>
                                <span
                                  class="font-medium text-indigo-700 dark:text-indigo-300"
                                  >Max Retries:</span
                                >
                                <span
                                  class="text-indigo-900 dark:text-indigo-100 ml-2"
                                  >{func.maxretries}</span
                                >
                              </div>
                            {/if}
                            {#if func.priority !== undefined}
                              <div>
                                <span
                                  class="font-medium text-indigo-700 dark:text-indigo-300"
                                  >Priority:</span
                                >
                                <span
                                  class="text-indigo-900 dark:text-indigo-100 ml-2"
                                  >{func.priority}</span
                                >
                              </div>
                            {/if}
                          </div>
                        </div>
                        {#if func.conditions}
                          <div
                            class="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-700"
                          >
                            <span
                              class="font-medium text-indigo-700 dark:text-indigo-300 text-sm"
                              >Conditions:</span
                            >
                            <div
                              class="mt-1 bg-indigo-100 dark:bg-indigo-900/30 rounded p-2 text-xs"
                            >
                              <pre
                                class="text-indigo-900 dark:text-indigo-100 font-mono whitespace-pre-wrap">{JSON.stringify(
                                  func.conditions,
                                  null,
                                  2,
                                )}</pre>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div
                    class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 text-center text-gray-500 dark:text-slate-300 text-sm"
                  >
                    No functions available for this executor
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {:else}
          <div class="text-center py-8 text-gray-500 dark:text-slate-300">
            No details available
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600 flex justify-end"
      >
        <button
          onclick={onClose}
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-slate-500 dark:hover:bg-slate-400 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}


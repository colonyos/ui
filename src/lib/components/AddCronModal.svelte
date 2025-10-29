<script lang="ts">
  import type { ColonyClient } from "$lib/api/colony";

  interface Props {
    show: boolean;
    client: ColonyClient | null;
    onClose: () => void;
    onCronAdded?: () => void;
  }

  let { show, client, onClose, onCronAdded }: Props = $props();

  let jsonInput = $state("");
  let submitStatus: "idle" | "submitting" | "success" | "error" = $state("idle");
  let submitError = $state("");
  let fileInputElement = $state<HTMLInputElement | null>(null);

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        jsonInput = content;
      };
      reader.readAsText(file);
    }
  }

  function resetForm() {
    jsonInput = "";
    submitStatus = "idle";
    submitError = "";
    if (fileInputElement) {
      fileInputElement.value = "";
    }
  }

  async function handleSubmit() {
    if (!client) {
      submitError = "Client not initialized";
      submitStatus = "error";
      return;
    }

    if (!jsonInput.trim()) {
      submitError = "Please provide a cron specification";
      submitStatus = "error";
      return;
    }

    submitStatus = "submitting";
    submitError = "";

    try {
      // Parse and validate JSON
      const cronSpec = JSON.parse(jsonInput);

      // Submit the cron
      await client.addCron(cronSpec);

      submitStatus = "success";

      // Wait a bit to show success message, then close and refresh
      setTimeout(() => {
        onCronAdded?.();
        resetForm();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Failed to add cron:", error);
      submitError = error instanceof Error ? error.message : String(error);
      submitStatus = "error";
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div
      class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Cron Job
            </h3>
            <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Upload a JSON file or paste the cron specification
            </p>
          </div>
          <button
            onclick={handleClose}
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
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
        <!-- File Upload -->
        <div class="mb-4">
          <label
            for="file-upload"
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Upload JSON File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".json"
            onchange={handleFileUpload}
            bind:this={fileInputElement}
            class="block w-full text-sm text-gray-500 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
        </div>

        <!-- JSON Text Input -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <label
              for="json-input"
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Cron Specification (JSON)
            </label>
          </div>
          <textarea
            id="json-input"
            bind:value={jsonInput}
            placeholder="Paste your cron specification JSON here"
            rows="10"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Instructions -->
        <div
          class="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Cron Fields
          </h4>
          <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">cronid</code> - Cron job ID</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">initiatorid</code> - Initiator ID</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">initiatorname</code> - Initiator name</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">colonyname</code> - Colony name</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">name</code> - Cron job name</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">cronexpression</code> - Cron expression (e.g., "0 * * * *")</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">interval</code> - Interval in seconds (alternative to cronexpression)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">random</code> - Random execution (boolean)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nextrun</code> - Next run time (timestamp)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">lastrun</code> - Last run time (timestamp)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">workflowspec</code> - Workflow specification (JSON string)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">prevprocessgraphid</code> - Previous process graph ID</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">waitforprevprocessgraph</code> - Wait for previous process graph (boolean)</li>
            <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">checkerperiod</code> - Checker period in seconds</li>
          </ul>
        </div>

        <!-- Status Messages -->
        {#if submitStatus === "error"}
          <div
            class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded"
          >
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <strong class="font-semibold">Error:</strong>
                <p class="mt-1 text-sm break-words">{submitError}</p>
              </div>
            </div>
          </div>
        {:else if submitStatus === "success"}
          <div
            class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded"
          >
            <div class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div class="flex-1">
                <strong class="font-semibold">Success:</strong>
                <p class="mt-1 text-sm">Cron job added successfully!</p>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600"
      >
        <div class="flex justify-end gap-3">
          <button
            onclick={handleClose}
            disabled={submitStatus === "submitting"}
            class="px-4 py-2 border border-gray-300 dark:border-slate-500 rounded-lg text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onclick={handleSubmit}
            disabled={submitStatus === "submitting" || submitStatus === "success"}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {#if submitStatus === "submitting"}
              <div class="flex items-center">
                <div
                  class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                ></div>
                Adding...
              </div>
            {:else}
              Add Cron Job
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

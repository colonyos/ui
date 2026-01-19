<script lang="ts">
  import type { ColonyClient } from "$lib/api/colony";

  interface Props {
    show: boolean;
    client: ColonyClient | null;
    onClose: () => void;
    onProcessSubmitted?: () => void;
  }

  let { show, client, onClose, onProcessSubmitted }: Props = $props();

  let jsonInput = $state("");
  let submitStatus: "idle" | "submitting" | "success" | "error" =
    $state("idle");
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
      submitError = "Please provide a process specification";
      submitStatus = "error";
      return;
    }

    submitStatus = "submitting";
    submitError = "";

    try {
      // Parse and validate JSON
      const processSpec = JSON.parse(jsonInput);

      // Submit the process
      await client.submitProcess(processSpec);

      submitStatus = "success";
      // The timeout is now handled by the $effect below
    } catch (error) {
      console.error("Failed to submit process:", error);
      if (error instanceof SyntaxError) {
        submitError = "Invalid JSON format: " + error.message;
      } else {
        submitError = error instanceof Error ? error.message : String(error);
      }
      submitStatus = "error";
    }
  }

  // Effect to handle auto-close after success with proper cleanup
  $effect(() => {
    if (submitStatus === 'success') {
      const timeoutId = setTimeout(() => {
        onProcessSubmitted?.();
        resetForm();
        onClose();
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  });
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="submit-process-title"
    aria-describedby="submit-process-description"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
  >
    <div
      class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
        <div class="flex justify-between items-start">
          <div>
            <h3 id="submit-process-title" class="text-lg font-semibold text-gray-900 dark:text-white">
              Submit Process
            </h3>
            <p id="submit-process-description" class="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Upload a JSON file or paste the process specification
            </p>
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
      <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
        <!-- File Upload -->
        <div class="mb-4">
          <label
            for="process-file-upload"
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Upload JSON File
          </label>
          <input
            id="process-file-upload"
            type="file"
            accept=".json"
            onchange={handleFileUpload}
            bind:this={fileInputElement}
            class="block w-full text-sm text-gray-500 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
        </div>

        <!-- JSON Text Input -->
        <div class="mb-4">
          <label
            for="process-json-input"
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Process Specification (JSON)
          </label>
          <textarea
            id="process-json-input"
            bind:value={jsonInput}
            placeholder="Paste your process specification JSON here"
            rows="10"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Field Documentation -->
        <div
          class="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
        >
          <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Function Specification Structure
          </h4>

          <!-- Function Spec (top level) -->
          <div class="mb-3 pl-2 border-l-2 border-blue-300 dark:border-blue-600">
            <h5 class="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">FunctionSpec fields:</h5>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nodename</code> - Node name for visualization (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">funcname</code> - Function name to execute (required)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">args</code> - Positional arguments (array, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">kwargs</code> - Keyword arguments (object, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">priority</code> - Priority level (int, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">maxwaittime</code> - Max wait time in seconds (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">maxexectime</code> - Max execution time in seconds (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">maxretries</code> - Maximum retry attempts (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">conditions</code> - Execution conditions (object, required)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">label</code> - Task label (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">env</code> - Environment variables (object, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">fs</code> - Filesystem configuration (object, optional)</li>
            </ul>
          </div>

          <!-- Conditions structure -->
          <div class="mb-3 pl-4 border-l-2 border-blue-300 dark:border-blue-600">
            <h5 class="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">conditions (required):</h5>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">colonyname</code> - Target colony name</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">executortype</code> - Executor type (e.g., "cli")</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">executornames</code> - Target executor names (array, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">dependencies</code> - Task dependencies (array, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nodes</code> - Number of nodes (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">cpu</code> - CPU requirement (e.g., "100m", optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">processes</code> - Total processes (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">processespernode</code> - Processes per node (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">mem</code> - Memory (e.g., "1Gi", optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">storage</code> - Storage requirement (optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">gpu</code> - GPU requirement (object, optional)</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">walltime</code> - Wall time limit in seconds (optional)</li>
            </ul>
          </div>

          <!-- GPU structure -->
          <div class="mb-3 pl-6 border-l-2 border-blue-300 dark:border-blue-600">
            <h5 class="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">conditions → gpu (optional):</h5>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">name</code> - GPU name/type</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">mem</code> - GPU memory</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">count</code> - Number of GPUs per node</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">nodecount</code> - Number of GPU nodes</li>
            </ul>
          </div>

          <!-- Kwargs structure -->
          <div class="pl-4 border-l-2 border-blue-300 dark:border-blue-600">
            <h5 class="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">kwargs (function-specific):</h5>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">cmd</code> - Command to execute</li>
              <li><code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">docker-image</code> - Docker image to use</li>
              <li class="text-blue-600 dark:text-blue-400 italic">...additional function-specific parameters</li>
            </ul>
          </div>
        </div>

        <!-- Status Messages -->
        {#if submitStatus === "error"}
          <div
            class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded"
          >
            <strong>Error:</strong>
            {submitError}
          </div>
        {:else if submitStatus === "success"}
          <div
            class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded"
          >
            <strong>Success!</strong> Process submitted successfully
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-600 flex justify-end gap-3"
      >
        <button
          onclick={onClose}
          disabled={submitStatus === "submitting"}
          class="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-slate-500 dark:hover:bg-slate-400 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleSubmit}
          disabled={submitStatus === "submitting" || !jsonInput.trim()}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
        >
          {#if submitStatus === "submitting"}
            <div
              class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
            ></div>
            Submitting...
          {:else}
            Submit Process
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

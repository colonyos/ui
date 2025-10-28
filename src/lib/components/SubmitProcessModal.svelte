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
  let fileInputElement: HTMLInputElement | null = null;

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

      // Wait a bit to show success message, then close and refresh
      setTimeout(() => {
        onProcessSubmitted?.();
        resetForm();
        onClose();
      }, 1500);
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

  function loadSampleSpec() {
    const sample = {
      conditions: {
        executortype: "cli",
      },
      func: "sleep",
      args: ["3"],
      env: {
        TEST: "testenv",
      },
    };
    jsonInput = JSON.stringify(sample, null, 2);
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    onclick={handleBackdropClick}
  >
    <div
      class="bg-white dark:bg-slate-700 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-600">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Submit Process
            </h3>
            <p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Upload a JSON file or paste the process specification
            </p>
          </div>
          <button
            onclick={onClose}
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
            class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
          >
            Upload JSON File
          </label>
          <input
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
              class="block text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              Process Specification (JSON)
            </label>
            <button
              onclick={loadSampleSpec}
              class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Load sample
            </button>
          </div>
          <textarea
            bind:value={jsonInput}
            placeholder="Paste your process specification JSON here"
            rows="7"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          ></textarea>
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

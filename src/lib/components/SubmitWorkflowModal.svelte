<script lang="ts">
	import type { ColonyClient } from '$lib/api/colony';
	import { get } from 'svelte/store';
	import { appState } from '$lib/stores/appState';
	import { envConfig } from '$lib/config/env';

	let { show = $bindable(false), client, onWorkflowSubmitted }: {
		show: boolean;
		client: ColonyClient | null;
		onWorkflowSubmitted: () => void;
	} = $props();

	let workflowSpecJson = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let fileInputElement = $state<HTMLInputElement | null>(null);

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				workflowSpecJson = content;
			};
			reader.readAsText(file);
		}
	}

	function resetForm() {
		workflowSpecJson = '';
		errorMessage = '';
		if (fileInputElement) {
			fileInputElement.value = '';
		}
	}

	function closeModal() {
		show = false;
		resetForm();
	}

	async function handleSubmit() {
		if (!client) {
			errorMessage = 'Colony client not initialized';
			return;
		}

		errorMessage = '';
		isSubmitting = true;

		try {
			// Parse the JSON
			const functionSpecs = JSON.parse(workflowSpecJson);

			if (!Array.isArray(functionSpecs)) {
				errorMessage = 'Workflow spec must be an array of function specifications';
				isSubmitting = false;
				return;
			}

			const state = get(appState);
			const colonyName = state.colonyName || envConfig.colonyName;

			if (!colonyName) {
				errorMessage = 'Colony name not configured';
				isSubmitting = false;
				return;
			}

			// Submit the workflow
			await client.submitWorkflowSpec({
				colonyname: colonyName,
				functionspecs: functionSpecs
			});

			// Success - close modal and notify parent
			resetForm();
			onWorkflowSubmitted();
		} catch (err) {
			console.error('Failed to submit workflow:', err);
			errorMessage = err instanceof Error ? err.message : String(err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackdropClick() {
		if (!isSubmitting) {
			closeModal();
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Escape' && closeModal()}>
		<div class="bg-white dark:bg-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submit Workflow</h3>

			{#if errorMessage}
				<div class="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-sm">
					{errorMessage}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<!-- JSON Text Input -->
				<div class="mb-4">
					<label for="workflowSpec" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
						Workflow Specification (JSON)
					</label>
					<textarea
						id="workflowSpec"
						bind:value={workflowSpecJson}
						disabled={isSubmitting}
						rows="20"
						class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700"
						placeholder="Paste workflow specification (array of FunctionSpec) here"
						required
					></textarea>
					<p class="mt-2 text-xs text-gray-500 dark:text-slate-400">
						Enter an array of function specifications. Each spec must have <code>nodename</code>, <code>funcname</code>, and <code>conditions</code>.
					</p>
				</div>

				<!-- File Upload -->
				<div class="mb-4">
					<label for="workflow-file-upload" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
						Or Upload Workflow Spec JSON File
					</label>
					<input
						id="workflow-file-upload"
						type="file"
						accept=".json"
						onchange={handleFileUpload}
						bind:this={fileInputElement}
						disabled={isSubmitting}
						class="block w-full text-sm text-gray-500 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 disabled:opacity-50"
					/>
				</div>

				<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mb-4">
					<h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Example Structure:</h4>
					<pre class="text-xs text-blue-800 dark:text-blue-200 overflow-x-auto"><code>{`[
  {
    "nodename": "task_a",
    "funcname": "echo",
    "args": ["task1"],
    "conditions": {
      "executortype": "cli",
      "dependencies": null
    }
  },
  {
    "nodename": "task_b",
    "funcname": "echo",
    "args": ["task2"],
    "conditions": {
      "executortype": "cli",
      "dependencies": ["task_a"]
    }
  }
]`}</code></pre>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closeModal}
						disabled={isSubmitting}
						class="px-4 py-2 text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 disabled:bg-gray-50 dark:disabled:bg-slate-700 rounded transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded transition-colors"
					>
						{isSubmitting ? 'Submitting...' : 'Submit Workflow'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

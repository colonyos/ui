<script lang="ts">
	import { onMount } from 'svelte';

	// Placeholder for future component types
	type ComponentType = 'server' | 'executor' | 'custom';

	interface CanvasComponent {
		id: string;
		type: ComponentType;
		name: string;
		x: number;
		y: number;
	}

	interface ComponentConnection {
		id: string;
		sourceId: string;
		targetId: string;
	}

	let components: CanvasComponent[] = $state([]);
	let connections: ComponentConnection[] = $state([]);
	let selectedTool: ComponentType | 'connection' | null = $state(null);
	let canvasScale = $state(1);
	let canvasPanX = $state(0);
	let canvasPanY = $state(0);

	function handleAddComponent(type: ComponentType) {
		selectedTool = type;
		// Future: Add component on canvas click
	}

	function handleAddConnection() {
		selectedTool = 'connection';
		// Future: Draw connections between components
	}

	function resetCanvas() {
		components = [];
		connections = [];
		selectedTool = null;
	}

	function zoomIn() {
		canvasScale = Math.min(canvasScale + 0.1, 2);
	}

	function zoomOut() {
		canvasScale = Math.max(canvasScale - 0.1, 0.5);
	}

	function resetZoom() {
		canvasScale = 1;
		canvasPanX = 0;
		canvasPanY = 0;
	}
</script>

<svelte:head>
	<title>Deployment Designer - Colony Dashboard</title>
</svelte:head>

<div class="deployment-page">
	<div class="page-header">
		<h1 class="page-title">Deployment Designer</h1>
		<p class="page-description">Design and deploy Colony infrastructure by adding components and linking them together</p>
	</div>

	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-section">
			<h3 class="toolbar-title">Components</h3>
			<div class="toolbar-buttons">
				<button
					onclick={() => handleAddComponent('server')}
					class="tool-btn {selectedTool === 'server' ? 'active' : ''}"
					title="Add Server"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
					</svg>
					<span>Server</span>
				</button>
				<button
					onclick={() => handleAddComponent('executor')}
					class="tool-btn {selectedTool === 'executor' ? 'active' : ''}"
					title="Add Executor"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
					</svg>
					<span>Executor</span>
				</button>
				<button
					onclick={() => handleAddComponent('custom')}
					class="tool-btn {selectedTool === 'custom' ? 'active' : ''}"
					title="Add Custom Resource"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					<span>Custom</span>
				</button>
			</div>
		</div>

		<div class="toolbar-divider"></div>

		<div class="toolbar-section">
			<h3 class="toolbar-title">Tools</h3>
			<div class="toolbar-buttons">
				<button
					onclick={handleAddConnection}
					class="tool-btn {selectedTool === 'connection' ? 'active' : ''}"
					title="Connect Components"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
					</svg>
					<span>Connect</span>
				</button>
			</div>
		</div>

		<div class="toolbar-divider"></div>

		<div class="toolbar-section">
			<h3 class="toolbar-title">View</h3>
			<div class="toolbar-buttons">
				<button onclick={zoomIn} class="tool-btn-icon" aria-label="Zoom In" title="Zoom In">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
					</svg>
				</button>
				<button onclick={zoomOut} class="tool-btn-icon" aria-label="Zoom Out" title="Zoom Out">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
					</svg>
				</button>
				<button onclick={resetZoom} class="tool-btn-icon" aria-label="Reset View" title="Reset View">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
					</svg>
				</button>
				<span class="zoom-indicator">{Math.round(canvasScale * 100)}%</span>
			</div>
		</div>

		<div class="toolbar-spacer"></div>

		<div class="toolbar-section">
			<div class="toolbar-buttons">
				<button onclick={resetCanvas} class="tool-btn-danger" title="Clear Canvas">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					<span>Clear</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Canvas Area -->
	<div class="canvas-container">
		<div class="canvas-wrapper">
			<div class="canvas" style="transform: scale({canvasScale}) translate({canvasPanX}px, {canvasPanY}px);">
				<!-- Grid Background -->
				<svg class="canvas-grid" width="100%" height="100%">
					<defs>
						<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
							<circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.2" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#grid)" />
				</svg>

				<!-- Canvas Content -->
				<div class="canvas-content">
					{#if components.length === 0}
						<div class="canvas-placeholder">
							<div class="placeholder-icon">
								<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
								</svg>
							</div>
							<h3 class="placeholder-title">Design Your Deployment</h3>
							<p class="placeholder-description">
								Click on a component type in the toolbar above to start adding servers, executors, and custom resources to your deployment canvas.
							</p>
							<div class="placeholder-hints">
								<div class="hint-item">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<span>Select a component type from the toolbar</span>
								</div>
								<div class="hint-item">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
									</svg>
									<span>Click on the canvas to place components</span>
								</div>
								<div class="hint-item">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
									</svg>
									<span>Use the Connect tool to link components together</span>
								</div>
							</div>
						</div>
					{:else}
						<!-- Future: Render components and connections here -->
						<div class="canvas-info">
							<p>{components.length} component{components.length !== 1 ? 's' : ''}</p>
							<p>{connections.length} connection{connections.length !== 1 ? 's' : ''}</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Status Bar -->
		<div class="status-bar">
			<div class="status-item">
				<span class="status-label">Selected Tool:</span>
				<span class="status-value">{selectedTool || 'None'}</span>
			</div>
			<div class="status-item">
				<span class="status-label">Components:</span>
				<span class="status-value">{components.length}</span>
			</div>
			<div class="status-item">
				<span class="status-label">Connections:</span>
				<span class="status-value">{connections.length}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.deployment-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 4rem);
		background: #f9fafb;
	}

	:global(.dark) .deployment-page {
		background: #1e293b;
	}

	.page-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	:global(.dark) .page-description {
		color: #94a3b8;
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		flex-wrap: wrap;
	}

	:global(.dark) .toolbar {
		background: #334155;
		border-bottom-color: #475569;
	}

	.toolbar-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toolbar-title {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin: 0;
	}

	:global(.dark) .toolbar-title {
		color: #94a3b8;
	}

	.toolbar-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.toolbar-divider {
		width: 1px;
		height: 3rem;
		background: #e5e7eb;
	}

	:global(.dark) .toolbar-divider {
		background: #475569;
	}

	.toolbar-spacer {
		flex: 1;
	}

	.tool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
	}

	:global(.dark) .tool-btn {
		background: #475569;
		border-color: #64748b;
		color: #e2e8f0;
	}

	.tool-btn:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	:global(.dark) .tool-btn:hover {
		background: #64748b;
		border-color: #94a3b8;
	}

	.tool-btn.active {
		background: #dbeafe;
		border-color: #3b82f6;
		color: #1e40af;
	}

	:global(.dark) .tool-btn.active {
		background: #1e40af;
		border-color: #60a5fa;
		color: #dbeafe;
	}

	.tool-btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		color: #374151;
		cursor: pointer;
		transition: all 0.2s;
	}

	:global(.dark) .tool-btn-icon {
		background: #475569;
		border-color: #64748b;
		color: #e2e8f0;
	}

	.tool-btn-icon:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	:global(.dark) .tool-btn-icon:hover {
		background: #64748b;
		border-color: #94a3b8;
	}

	.tool-btn-danger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #dc2626;
		cursor: pointer;
		transition: all 0.2s;
	}

	:global(.dark) .tool-btn-danger {
		background: #7f1d1d;
		border-color: #991b1b;
		color: #fca5a5;
	}

	.tool-btn-danger:hover {
		background: #fee2e2;
		border-color: #fca5a5;
	}

	:global(.dark) .tool-btn-danger:hover {
		background: #991b1b;
		border-color: #b91c1c;
	}

	.zoom-indicator {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		padding: 0.25rem 0.5rem;
		background: #f3f4f6;
		border-radius: 0.25rem;
	}

	:global(.dark) .zoom-indicator {
		color: #cbd5e1;
		background: #1e293b;
	}

	/* Canvas */
	.canvas-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #ffffff;
	}

	:global(.dark) .canvas-container {
		background: #0f172a;
	}

	.canvas-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.canvas {
		width: 100%;
		height: 100%;
		position: relative;
		transform-origin: center center;
		transition: transform 0.2s ease;
	}

	.canvas-grid {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		color: #9ca3af;
		pointer-events: none;
	}

	:global(.dark) .canvas-grid {
		color: #475569;
	}

	.canvas-content {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 600px;
	}

	.canvas-placeholder {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		max-width: 500px;
		padding: 2rem;
	}

	.placeholder-icon {
		color: #9ca3af;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}

	:global(.dark) .placeholder-icon {
		color: #64748b;
	}

	.placeholder-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #111827;
		margin-bottom: 0.75rem;
	}

	:global(.dark) .placeholder-title {
		color: #f1f5f9;
	}

	.placeholder-description {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	:global(.dark) .placeholder-description {
		color: #94a3b8;
	}

	.placeholder-hints {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
		text-align: left;
	}

	.hint-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
	}

	:global(.dark) .hint-item {
		color: #cbd5e1;
	}

	.hint-item svg {
		color: #3b82f6;
		flex-shrink: 0;
	}

	:global(.dark) .hint-item svg {
		color: #60a5fa;
	}

	.canvas-info {
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		margin: 1rem;
	}

	:global(.dark) .canvas-info {
		background: #1e293b;
		border-color: #334155;
		color: #e2e8f0;
	}

	/* Status Bar */
	.status-bar {
		display: flex;
		gap: 2rem;
		padding: 0.5rem 1.5rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
		font-size: 0.75rem;
	}

	:global(.dark) .status-bar {
		background: #1e293b;
		border-top-color: #334155;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-label {
		color: #6b7280;
		font-weight: 500;
	}

	:global(.dark) .status-label {
		color: #94a3b8;
	}

	.status-value {
		color: #111827;
		font-weight: 600;
	}

	:global(.dark) .status-value {
		color: #f1f5f9;
	}
</style>

<script lang="ts">
	import type { ColonyGraphData, GraphNode, ColonyServer, ColonyExecutor } from '$lib/types/colony-graph';

	interface Props {
		data: ColonyGraphData;
		onNodeClick?: (node: GraphNode) => void;
	}

	let { data, onNodeClick }: Props = $props();

	function handleServerClick(server: ColonyServer) {
		if (onNodeClick) {
			onNodeClick({
				id: server.id,
				type: 'server',
				data: server
			});
		}
	}

	function handleExecutorClick(executor: ColonyExecutor) {
		if (onNodeClick) {
			onNodeClick({
				id: executor.id,
				type: 'executor',
				data: executor
			});
		}
	}

	function getStatusColor(status: string, type: 'server' | 'executor'): string {
		if (type === 'server') {
			switch (status) {
				case 'online': return 'bg-emerald-500';
				case 'offline': return 'bg-red-500';
				case 'connecting': return 'bg-yellow-500';
				default: return 'bg-gray-500';
			}
		} else {
			switch (status) {
				case 'online': return 'bg-emerald-400';  // Light green for online/idle
				case 'idle': return 'bg-emerald-400';     // Light green for idle
				case 'busy': return 'bg-orange-500';      // Orange for busy
				case 'offline': return 'bg-gray-400';     // Gray for offline
				default: return 'bg-emerald-400';
			}
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'busy': return '⚡';
			case 'idle':
			case 'online': return '✓';
			case 'offline': return '○';
			default: return 'E';
		}
	}
</script>

<div class="static-colony-diagram">
	<div class="diagram-container">
		{#each data.servers as server, serverIndex}
			{@const connectedExecutors = data.executors.filter(e => e.serverId === server.id)}
			<div class="server-group" style="--server-index: {serverIndex}">
				<!-- Server Node -->
				<div
					class="server-node {getStatusColor(server.status, 'server')}"
					onclick={() => handleServerClick(server)}
				>
					<div class="server-label">SERVER</div>
					<div class="server-name">{server.name}</div>
					<div class="server-info">
						{server.host}:{server.port}
					</div>
					<div class="server-executor-count">
						{connectedExecutors.length} executor{connectedExecutors.length !== 1 ? 's' : ''}
					</div>
				</div>

				<!-- Connected Executors -->
				<div class="executors-container">
					{#each connectedExecutors as executor, executorIndex}
						<div
							class="executor-connection"
							style="--executor-index: {executorIndex}"
						>
							<!-- Connection Line -->
							<div class="connection-line"></div>

							<!-- Executor Node -->
							<div
								class="executor-node {getStatusColor(executor.status, 'executor')}"
								onclick={() => handleExecutorClick(executor)}
								title="{executor.name} - {executor.status}"
							>
								<div class="executor-icon">{getStatusIcon(executor.status)}</div>
								<div class="executor-name">{executor.name}</div>
								{#if executor.processCount !== undefined && executor.processCount > 0}
									<div class="executor-process-count">
										{executor.processCount} job{executor.processCount !== 1 ? 's' : ''}
									</div>
								{/if}
								{#if executor.capabilities && executor.capabilities.length > 0}
									<div class="executor-capabilities">
										{#each executor.capabilities.slice(0, 2) as capability}
											<span class="capability-tag">{capability}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}

					{#if connectedExecutors.length === 0}
						<div class="no-executors-message">
							No executors connected
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Status Summary -->
	<div class="status-summary">
		<div class="summary-item">
			<span class="summary-label">Total Servers:</span>
			<span class="summary-value">{data.servers.length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Online Servers:</span>
			<span class="summary-value text-green-600">{data.servers.filter(s => s.status === 'online').length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Total Executors:</span>
			<span class="summary-value">{data.executors.length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Busy Executors:</span>
			<span class="summary-value text-yellow-600">{data.executors.filter(e => e.status === 'busy').length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Active Jobs:</span>
			<span class="summary-value text-blue-600">{data.activeJobs.filter(j => j.status === 'running').length}</span>
		</div>
	</div>
</div>

<style>
	.static-colony-diagram {
		width: 100%;
		padding: 2rem;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.diagram-container {
		display: flex;
		flex-wrap: wrap;
		gap: 4rem;
		justify-content: center;
		align-items: flex-start;
		min-height: 400px;
		margin-bottom: 2rem;
	}

	.server-group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
		padding: 1rem;
		background: white;
		border-radius: 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.server-node {
		width: 160px;
		height: 90px;
		border-radius: 12px;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
		z-index: 10;
	}

	.server-node:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
	}

	.server-label {
		font-size: 10px;
		font-weight: bold;
		letter-spacing: 0.5px;
		opacity: 0.9;
	}

	.server-name {
		font-size: 12px;
		font-weight: 600;
		margin: 2px 0;
	}

	.server-info {
		font-size: 8px;
		opacity: 0.8;
	}

	.server-executor-count {
		font-size: 9px;
		font-weight: 600;
		margin-top: 2px;
		opacity: 0.9;
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 8px;
	}

	.no-executors-message {
		padding: 1rem;
		color: #64748b;
		font-size: 0.875rem;
		font-style: italic;
		text-align: center;
	}

	.executors-container {
		display: flex;
		flex-direction: row;
		gap: 2rem;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		width: 100%;
		padding: 1rem;
	}

	.executor-connection {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}

	.connection-line {
		width: 3px;
		height: 60px;
		background: linear-gradient(180deg, #3b82f6, #60a5fa);
		position: relative;
		margin-bottom: 0.5rem;
	}

	.connection-line::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		width: 10px;
		height: 10px;
		background: #3b82f6;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
	}

	.connection-line::after {
		content: '';
		position: absolute;
		bottom: -8px;
		left: 50%;
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-top: 8px solid #60a5fa;
		transform: translateX(-50%);
	}

	.executor-node {
		width: 110px;
		height: 110px;
		transform: rotate(45deg);
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
		border: 3px solid rgba(255, 255, 255, 0.3);
	}

	.executor-node:hover {
		transform: rotate(45deg) scale(1.08);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	.executor-node > * {
		transform: rotate(-45deg);
		text-align: center;
	}

	.executor-icon {
		font-size: 18px;
		font-weight: bold;
		margin-bottom: 6px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.executor-name {
		font-size: 10px;
		font-weight: 700;
		margin-bottom: 3px;
		line-height: 1.1;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
		max-width: 70px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.executor-process-count {
		font-size: 8px;
		font-weight: 600;
		margin-bottom: 2px;
		padding: 1px 4px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 6px;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
	}

	.executor-capabilities {
		display: flex;
		gap: 2px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.capability-tag {
		background: rgba(255, 255, 255, 0.2);
		padding: 1px 4px;
		border-radius: 2px;
		font-size: 6px;
		font-weight: 500;
	}

	.status-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		justify-content: center;
		padding: 1.5rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.summary-label {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
	}

	.summary-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1e293b;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.diagram-container {
			gap: 2rem;
		}

		.server-node {
			width: 120px;
			height: 70px;
		}

		.executor-node {
			width: 80px;
			height: 80px;
		}

		.connection-line {
			width: 40px;
		}

		.status-summary {
			gap: 1rem;
		}
	}
</style>
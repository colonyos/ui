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
				case 'online': return 'bg-green-500';
				case 'offline': return 'bg-red-500';
				case 'connecting': return 'bg-yellow-500';
				default: return 'bg-gray-500';
			}
		} else {
			switch (status) {
				case 'online':
				case 'idle': return 'bg-green-500';
				case 'busy': return 'bg-yellow-500';
				case 'offline': return 'bg-gray-500';
				default: return 'bg-gray-500';
			}
		}
	}
</script>

<div class="static-colony-diagram">
	<div class="diagram-container">
		{#each data.servers as server, serverIndex}
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
				</div>

				<!-- Connected Executors -->
				<div class="executors-container">
					{#each data.executors.filter(e => e.serverId === server.id) as executor, executorIndex}
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
							>
								<div class="executor-icon">E</div>
								<div class="executor-name">{executor.name}</div>
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
		gap: 2rem;
	}

	.server-node {
		width: 140px;
		height: 80px;
		border-radius: 12px;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
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

	.executors-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
	}

	.executor-connection {
		position: relative;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.connection-line {
		width: 60px;
		height: 2px;
		background: linear-gradient(90deg, #94a3b8, #cbd5e1);
		position: relative;
	}

	.connection-line::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 6px;
		height: 6px;
		background: #64748b;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}

	.connection-line::after {
		content: '';
		position: absolute;
		top: 50%;
		right: 0;
		width: 0;
		height: 0;
		border-left: 6px solid #64748b;
		border-top: 4px solid transparent;
		border-bottom: 4px solid transparent;
		transform: translateY(-50%);
	}

	.executor-node {
		width: 100px;
		height: 100px;
		transform: rotate(45deg);
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
	}

	.executor-node:hover {
		transform: rotate(45deg) scale(1.05);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.executor-node > * {
		transform: rotate(-45deg);
		text-align: center;
	}

	.executor-icon {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 4px;
	}

	.executor-name {
		font-size: 8px;
		font-weight: 600;
		margin-bottom: 2px;
		line-height: 1;
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
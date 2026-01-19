<script lang="ts">
	import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import ServerNode from './flow-nodes/ServerNode.svelte';
	import CloudNode from './flow-nodes/CloudNode.svelte';
	import ExecutorNode from './flow-nodes/ExecutorNode.svelte';
	import type { ColonyGraphData, GraphNode, ColonyServer, ColonyExecutor } from '$lib/types/colony-graph';

	interface Props {
		data: ColonyGraphData;
		onNodeClick?: (node: GraphNode) => void;
	}

	let { data, onNodeClick }: Props = $props();

	const nodeTypes = {
		server: ServerNode,
		cloud: CloudNode,
		executor: ExecutorNode
	};

	let nodes = $state<any[]>([]);
	let edges = $state<any[]>([]);

	function buildFlowData() {
		const flowNodes: any[] = [];
		const flowEdges: any[] = [];

		data.servers.forEach((server, serverIndex) => {
			const connectedExecutors = data.executors.filter(e => e.serverId === server.id);

			// Calculate layout
			const execSpacing = 250;
			const totalWidth = Math.max(800, connectedExecutors.length * execSpacing);
			const centerX = totalWidth / 2;

			// Server node - estimate width based on content (hostname can be long)
			// Using a larger estimate to account for text like "cop-pilot-colonies.icedc.se:443"
			const serverWidth = 260;
			const serverId = `server-${server.id}`;
			flowNodes.push({
				id: serverId,
				type: 'server',
				position: { x: centerX - serverWidth / 2, y: 50 },
				data: {
					server,
					executorCount: connectedExecutors.length,
					onClick: () => onNodeClick?.({ id: server.id, type: 'server', data: server })
				},
				draggable: false
			});

			// Cloud node - width is fixed at 80px
			const cloudWidth = 80;
			const cloudId = `cloud-${server.id}`;
			flowNodes.push({
				id: cloudId,
				type: 'cloud',
				position: { x: centerX - cloudWidth / 2, y: 200 },
				data: {},
				draggable: false
			});

			// Edge from server to cloud
			flowEdges.push({
				id: `${serverId}-${cloudId}`,
				source: serverId,
				target: cloudId,
				style: { stroke: '#3b82f6', strokeWidth: 3 },
				animated: false
			});

			// Executor nodes
			const executorStartX = centerX - (connectedExecutors.length * execSpacing) / 2 + execSpacing / 2;

			connectedExecutors.forEach((executor, execIndex) => {
				const execId = `executor-${executor.id}`;
				const execX = executorStartX + execIndex * execSpacing;

				flowNodes.push({
					id: execId,
					type: 'executor',
					position: { x: execX - 60, y: 400 },
					data: {
						executor,
						onClick: () => onNodeClick?.({ id: executor.id, type: 'executor', data: executor })
					},
					draggable: false
				});

				// Edge from cloud to executor
				flowEdges.push({
					id: `${cloudId}-${execId}`,
					source: cloudId,
					target: execId,
					style: { stroke: '#60a5fa', strokeWidth: 2.5 },
					animated: false
				});
			});
		});

		nodes = flowNodes;
		edges = flowEdges;
	}

	$effect(() => {
		data;
		buildFlowData();
	});

	$effect(() => {
		buildFlowData();
	});
</script>

<div class="svelte-flow-diagram">
	<div style="height: 600px; width: 100%;">
		<SvelteFlow
			{nodes}
			{edges}
			{nodeTypes}
			fitView
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={true}
			zoomOnScroll={false}
			panOnScroll={false}
			panOnDrag={true}
		>
			<Background />
			<Controls />
		</SvelteFlow>
	</div>

	<!-- Status Summary -->
	<div class="status-summary">
		<div class="summary-item">
			<span class="summary-label">Total Servers:</span>
			<span class="summary-value">{data.servers.length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Online Servers:</span>
			<span class="summary-value text-green-600 dark:text-green-400">{data.servers.filter(s => s.status === 'online').length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Total Executors:</span>
			<span class="summary-value">{data.executors.length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Busy Executors:</span>
			<span class="summary-value text-yellow-600 dark:text-yellow-400">{data.executors.filter(e => e.status === 'busy').length}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Active Jobs:</span>
			<span class="summary-value text-blue-600 dark:text-blue-400">{data.activeJobs.filter(j => j.status === 'running').length}</span>
		</div>
	</div>
</div>

<style>
	.svelte-flow-diagram {
		width: 100%;
		padding: 2rem;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .svelte-flow-diagram {
		background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
	}

	/* Status Summary */
	.status-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		justify-content: center;
		padding: 1.5rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		margin-top: 2rem;
	}

	:global(.dark) .status-summary {
		background: #475569;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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

	:global(.dark) .summary-label {
		color: #cbd5e1;
	}

	.summary-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1e293b;
	}

	:global(.dark) .summary-value {
		color: #f1f5f9;
	}
</style>

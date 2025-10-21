<script lang="ts">
	interface ProcessGraphNode {
		id: string;
		data: {
			label: string;
		};
		position: {
			x: number;
			y: number;
		};
		type: string;
		style: {
			color: string;
			background: string;
		};
	}

	interface ProcessGraphEdge {
		id: string;
		source: string;
		target: string;
		animated: boolean;
	}

	interface ProcessGraphData {
		processgraphid: string;
		initiatorid: string;
		initiatorname: string;
		colonyname: string;
		rootprocessids: string[];
		state: number;
		submissiontime: string;
		starttime: string;
		endtime: string;
		processids: string[];
		nodes: ProcessGraphNode[];
		edges: ProcessGraphEdge[];
	}

	interface Props {
		graphData: ProcessGraphData | null;
		workflowId: string;
	}

	let { graphData, workflowId }: Props = $props();

	// Auto-layout nodes with proper spacing
	function layoutNodes(nodes: ProcessGraphNode[], edges: ProcessGraphEdge[]) {
		if (!nodes || nodes.length === 0) return nodes;

		// Create adjacency lists
		const incomingEdges: Map<string, string[]> = new Map();
		const outgoingEdges: Map<string, string[]> = new Map();

		nodes.forEach(node => {
			incomingEdges.set(node.id, []);
			outgoingEdges.set(node.id, []);
		});

		edges.forEach(edge => {
			const incoming = incomingEdges.get(edge.target) || [];
			incoming.push(edge.source);
			incomingEdges.set(edge.target, incoming);

			const outgoing = outgoingEdges.get(edge.source) || [];
			outgoing.push(edge.target);
			outgoingEdges.set(edge.source, outgoing);
		});

		// Find root nodes (no incoming edges)
		const roots = nodes.filter(node => (incomingEdges.get(node.id) || []).length === 0);

		// Calculate levels using BFS
		const levels: Map<string, number> = new Map();
		const visited: Set<string> = new Set();
		const queue: {id: string, level: number}[] = [];

		roots.forEach(root => {
			queue.push({id: root.id, level: 0});
			levels.set(root.id, 0);
		});

		let maxLevel = 0;
		while (queue.length > 0) {
			const {id, level} = queue.shift()!;
			if (visited.has(id)) continue;
			visited.add(id);
			maxLevel = Math.max(maxLevel, level);

			const children = outgoingEdges.get(id) || [];
			children.forEach(childId => {
				const currentLevel = levels.get(childId);
				const newLevel = level + 1;
				if (currentLevel === undefined || currentLevel < newLevel) {
					levels.set(childId, newLevel);
					queue.push({id: childId, level: newLevel});
				}
			});
		}

		// Group nodes by level
		const nodesByLevel: Map<number, ProcessGraphNode[]> = new Map();
		for (let i = 0; i <= maxLevel; i++) {
			nodesByLevel.set(i, []);
		}

		nodes.forEach(node => {
			const level = levels.get(node.id) || 0;
			const nodesAtLevel = nodesByLevel.get(level) || [];
			nodesAtLevel.push(node);
			nodesByLevel.set(level, nodesAtLevel);
		});

		// Position nodes with increased spacing
		const horizontalSpacing = 300; // Increased from default
		const verticalSpacing = 180; // Increased from default
		const nodeWidth = 200;

		const layoutedNodes = nodes.map(node => {
			const level = levels.get(node.id) || 0;
			const nodesAtLevel = nodesByLevel.get(level) || [];
			const indexAtLevel = nodesAtLevel.indexOf(node);
			const totalAtLevel = nodesAtLevel.length;

			// Center nodes horizontally at each level
			const startX = (totalAtLevel - 1) * horizontalSpacing / -2;

			return {
				...node,
				position: {
					x: 400 + startX + indexAtLevel * horizontalSpacing,
					y: 50 + level * verticalSpacing
				}
			};
		});

		return layoutedNodes;
	}

	// Calculate SVG edges with proper connection points
	function calculateSVGEdges(nodes: ProcessGraphNode[], edges: ProcessGraphEdge[]) {
		return edges.map(edge => {
			const sourceNode = nodes.find(n => n.id === edge.source);
			const targetNode = nodes.find(n => n.id === edge.target);

			if (!sourceNode || !targetNode) {
				return null;
			}

			const nodeWidth = 200;
			const nodeHeight = 80;

			return {
				...edge,
				from: {
					x: sourceNode.position.x + nodeWidth / 2,
					y: sourceNode.position.y + nodeHeight
				},
				to: {
					x: targetNode.position.x + nodeWidth / 2,
					y: targetNode.position.y
				}
			};
		}).filter(edge => edge !== null);
	}

	const nodes = $derived(layoutNodes(graphData?.nodes || [], graphData?.edges || []));
	const svgEdges = $derived(calculateSVGEdges(nodes, graphData?.edges || []));
	const viewBoxWidth = $derived(nodes.length > 0 ? Math.max(1000, Math.max(...nodes.map(n => n.position.x + 250)) + 100) : 1000);
	const viewBoxHeight = $derived(nodes.length > 0 ? Math.max(600, Math.max(...nodes.map(n => n.position.y + 100)) + 50) : 600);

	function getNodeTypeIcon(nodeType: string): string {
		switch (nodeType) {
			case 'input': return '▶';
			case 'output': return '◀';
			default: return '●';
		}
	}

	function formatTime(timeString: string): string {
		if (!timeString || timeString === '0001-01-01T00:00:00Z' || timeString === '0001-01-01T00:53:28+00:53') {
			return 'Not started';
		}
		try {
			return new Date(timeString).toLocaleString();
		} catch {
			return 'Invalid time';
		}
	}

	function getWorkflowStateLabel(state: number): string {
		switch (state) {
			case 0: return 'Waiting';
			case 1: return 'Running';
			case 2: return 'Successful';
			case 3: return 'Failed';
			default: return 'Unknown';
		}
	}

	function getWorkflowStateColor(state: number): string {
		switch (state) {
			case 0: return 'bg-yellow-100 text-yellow-800';
			case 1: return 'bg-blue-100 text-blue-800';
			case 2: return 'bg-green-100 text-green-800';
			case 3: return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-6">
	<div class="flex justify-between items-center mb-6">
		<div>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">Workflow DAG</h2>
			<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
				Workflow ID: <span class="font-mono text-xs">{workflowId}</span>
			</p>
			{#if graphData}
				<p class="text-sm text-gray-600 dark:text-slate-300 mt-1">
					Initiator: <span class="font-medium">{graphData.initiatorname}</span> •
					Colony: <span class="font-medium">{graphData.colonyname}</span>
				</p>
			{/if}
		</div>
		<div class="flex items-center gap-4">
			{#if graphData}
				<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getWorkflowStateColor(graphData.state)}">
					{getWorkflowStateLabel(graphData.state)}
				</span>
			{/if}
			<div class="text-sm text-gray-500 dark:text-slate-300">
				{nodes.length} process{nodes.length === 1 ? '' : 'es'}
			</div>
		</div>
	</div>

	{#if !graphData}
		<div class="text-center py-8 text-gray-500 dark:text-slate-300">
			No workflow data available
		</div>
	{:else if nodes.length === 0}
		<div class="text-center py-8 text-gray-500 dark:text-slate-300">
			No processes found for this workflow
		</div>
	{:else}
		<div class="overflow-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800">
			<svg
				viewBox="0 0 {viewBoxWidth} {viewBoxHeight}"
				class="w-full"
				style="min-width: {viewBoxWidth}px; height: {Math.max(500, viewBoxHeight * 0.6)}px;"
			>
				<!-- Arrow definitions -->
				<defs>
					<marker id="arrowhead" markerWidth="12" markerHeight="10"
							refX="11" refY="5" orient="auto">
						<polygon points="0 0, 12 5, 0 10" fill="#3b82f6" />
					</marker>
					<marker id="arrowhead-hover" markerWidth="12" markerHeight="10"
							refX="11" refY="5" orient="auto">
						<polygon points="0 0, 12 5, 0 10" fill="#1d4ed8" />
					</marker>
				</defs>

				<!-- Draw edges/arrows -->
				{#each svgEdges as edge}
					<g class="edge-group">
						<!-- Shadow line for better visibility -->
						<line
							x1={edge.from.x}
							y1={edge.from.y}
							x2={edge.to.x}
							y2={edge.to.y}
							stroke="white"
							stroke-width="5"
							opacity="0.8"
						/>
						<!-- Main arrow line -->
						<line
							x1={edge.from.x}
							y1={edge.from.y}
							x2={edge.to.x}
							y2={edge.to.y}
							stroke="#3b82f6"
							stroke-width="3"
							marker-end="url(#arrowhead)"
							class="transition-all hover:stroke-[#1d4ed8]"
						/>
					</g>
				{/each}

				<!-- Process nodes -->
				{#each nodes as node}
					<g transform="translate({node.position.x}, {node.position.y})">
						<!-- Node background - use lighter colors for better text contrast -->
						<rect
							width="200"
							height="80"
							rx="8"
							fill="#ffffff"
							stroke={node.type === 'input' ? '#10b981' : node.type === 'output' ? '#ef4444' : '#3b82f6'}
							stroke-width="2.5"
							class="hover:stroke-opacity-80 transition-all"
							filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
						/>

						<!-- Node type indicator -->
						<text
							x="10"
							y="20"
							class="text-sm font-bold"
							fill={node.type === 'input' ? '#10b981' : node.type === 'output' ? '#ef4444' : '#3b82f6'}
							font-size="14"
						>
							{getNodeTypeIcon(node.type)}
						</text>

						<!-- Process name -->
						<text
							x="100"
							y="35"
							text-anchor="middle"
							font-size="13"
							font-weight="600"
							fill="#1f2937"
						>
							{node.data.label}
						</text>

						<!-- Process ID (truncated) -->
						<text
							x="100"
							y="52"
							text-anchor="middle"
							font-size="10"
							font-family="monospace"
							fill="#6b7280"
						>
							{node.id.substring(0, 12)}...
						</text>

						<!-- Node type label -->
						<text
							x="100"
							y="68"
							text-anchor="middle"
							font-size="10"
							font-weight="500"
							fill={node.type === 'input' ? '#10b981' : node.type === 'output' ? '#ef4444' : '#3b82f6'}
						>
							{node.type === 'input' ? 'Start' : node.type === 'output' ? 'End' : 'Process'}
						</text>
					</g>
				{/each}
			</svg>
		</div>

		<!-- Workflow Details -->
		<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Workflow Information</h3>
				<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4">
					<dl class="space-y-2">
						<div class="flex justify-between">
							<dt class="text-sm text-gray-600 dark:text-slate-300">Initiator:</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">{graphData.initiatorname}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm text-gray-600 dark:text-slate-300">Colony:</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">{graphData.colonyname}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm text-gray-600 dark:text-slate-300">Submitted:</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">{formatTime(graphData.submissiontime)}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm text-gray-600 dark:text-slate-300">Root Processes:</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">{graphData.rootprocessids.length}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-sm text-gray-600 dark:text-slate-300">Total Processes:</dt>
							<dd class="text-sm font-medium text-gray-900 dark:text-white">{graphData.processids.length}</dd>
						</div>
					</dl>
				</div>
			</div>

			<div>
				<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Process Nodes</h3>
				<div class="bg-gray-50 dark:bg-slate-600 rounded-lg p-4 max-h-64 overflow-y-auto">
					<div class="space-y-2">
						{#each nodes as node}
							<div class="flex items-center justify-between py-1">
								<div class="flex items-center space-x-2">
									<span class="text-sm font-medium" style="color: {node.type === 'input' ? '#10b981' : node.type === 'output' ? '#ef4444' : '#6b7280'}">
										{getNodeTypeIcon(node.type)}
									</span>
									<span class="text-sm font-medium text-gray-900 dark:text-white">{node.data.label}</span>
								</div>
								<span class="text-xs font-mono text-gray-500 dark:text-slate-300">{node.id.substring(0, 8)}...</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
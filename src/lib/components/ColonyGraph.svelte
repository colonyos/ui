<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import JobFlowAnimation from './JobFlowAnimation.svelte';
	import type {
		ColonyGraphData,
		GraphNode,
		GraphLink,
		GraphDimensions,
		GraphOptions,
		JobFlowAnimation as JobFlowAnimationType
	} from '$lib/types/colony-graph';

	interface Props {
		data: ColonyGraphData;
		width?: number;
		height?: number;
		options?: Partial<GraphOptions>;
		onNodeClick?: (node: GraphNode) => void;
	}

	let {
		data,
		width = 800,
		height = 600,
		options = {},
		onNodeClick
	}: Props = $props();

	let svgElement: SVGElement;
	let nodes: GraphNode[] = $state([]);
	let links: GraphLink[] = $state([]);
	let svgSelection: d3.Selection<SVGElement, unknown, null, undefined>;

	const defaultOptions: GraphOptions = {
		forceStrength: -300,
		linkDistance: 100,
		chargeStrength: -300,
		collisionRadius: 30,
		animationSpeed: 1000,
		showLabels: true,
		showConnections: true,
		filterOfflineNodes: false
	};

	const graphOptions: GraphOptions = $derived({ ...defaultOptions, ...options });

	const dimensions: GraphDimensions = $derived({
		width,
		height,
		margin: { top: 20, right: 20, bottom: 20, left: 20 }
	});

	function transformDataToGraph(colonyData: ColonyGraphData): { nodes: GraphNode[]; links: GraphLink[] } {
		const nodeMap = new Map<string, GraphNode>();
		const graphNodes: GraphNode[] = [];
		const graphLinks: GraphLink[] = [];

		// Default positions for servers (spread horizontally)
		let serverIndex = 0;
		colonyData.servers.forEach(server => {
			if (!graphOptions.filterOfflineNodes || server.status !== 'offline') {
				const node: GraphNode = {
					id: server.id,
					type: 'server',
					data: server,
					x: server.position?.x || 300 + (serverIndex * 400),
					y: server.position?.y || 300
				};
				nodeMap.set(server.id, node);
				graphNodes.push(node);
				serverIndex++;
			}
		});

		// Default positions for executors (arranged around their servers)
		colonyData.executors.forEach((executor, index) => {
			if (!graphOptions.filterOfflineNodes || executor.status !== 'offline') {
				const serverNode = nodeMap.get(executor.serverId);
				const defaultX = serverNode ? serverNode.x! - 100 + (index * 80) : 200 + (index * 100);
				const defaultY = serverNode ? serverNode.y! - 100 : 150;

				const node: GraphNode = {
					id: executor.id,
					type: 'executor',
					data: executor,
					x: executor.position?.x || defaultX,
					y: executor.position?.y || defaultY
				};
				nodeMap.set(executor.id, node);
				graphNodes.push(node);

				if (serverNode) {
					graphLinks.push({
						source: serverNode,
						target: node,
						type: 'server-executor'
					});
				}
			}
		});

		return { nodes: graphNodes, links: graphLinks };
	}

	function getNodeColor(node: GraphNode): string {
		const statusColors = {
			server: {
				online: '#10b981',
				offline: '#ef4444',
				connecting: '#f59e0b'
			},
			executor: {
				online: '#3b82f6',
				offline: '#6b7280',
				busy: '#f59e0b',
				idle: '#10b981'
			}
		};

		const nodeData = node.data as any;
		return statusColors[node.type][nodeData.status] || '#6b7280';
	}

	function getNodeDimensions(node: GraphNode): { width: number; height: number; radius?: number } {
		if (node.type === 'server') {
			return { width: 80, height: 50 }; // Rounded rectangle for servers
		} else {
			return { width: 24, height: 24 }; // Square for executors
		}
	}

	let linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

	function initializeGraph() {
		if (!svgElement) return;

		svgSelection = d3.select(svgElement);
		svgSelection.selectAll('*').remove();

		const g = svgSelection
			.append('g')
			.attr('class', 'graph-container');

		const zoom = d3.zoom<SVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
			});

		svgSelection.call(zoom);

		linkGroup = g.append('g').attr('class', 'links');
		nodeGroup = g.append('g').attr('class', 'nodes');
		labelGroup = g.append('g').attr('class', 'labels');

		// Static rendering - no force simulation
		updateLinks();
		updateNodes();
		if (graphOptions.showLabels) {
			updateLabels();
		}
	}

	$effect(() => {
		const transformed = transformDataToGraph(data);
		nodes = transformed.nodes;
		links = transformed.links;

		if (linkGroup && nodeGroup) {
			updateLinks();
			updateNodes();
			if (graphOptions.showLabels && labelGroup) {
				updateLabels();
			}
		}
	});

	function updateLinks() {
		if (!linkGroup) return;
		const linkSelection = linkGroup
			.selectAll<SVGLineElement, GraphLink>('line')
			.data(links)
			.join('line')
			.attr('stroke', '#999')
			.attr('stroke-opacity', 0.6)
			.attr('stroke-width', 2)
			.attr('x1', d => (d.source as GraphNode).x || 0)
			.attr('y1', d => (d.source as GraphNode).y || 0)
			.attr('x2', d => (d.target as GraphNode).x || 0)
			.attr('y2', d => (d.target as GraphNode).y || 0);
	}

	function updateNodes() {
		if (!nodeGroup) return;
		const nodeSelection = nodeGroup
			.selectAll<SVGElement, GraphNode>('.node')
			.data(nodes)
			.join('g')
			.attr('class', 'node')
			.style('cursor', 'pointer')
			.on('click', (event, d) => {
				event.stopPropagation();
				if (onNodeClick) {
					onNodeClick(d);
				}
			});

		nodeSelection.selectAll('*').remove();

		nodeSelection.each(function(d) {
			const node = d3.select(this);
			const color = getNodeColor(d);
			const dims = getNodeDimensions(d);
			const nodeData = d.data as any;

			if (d.type === 'server') {
				// Rounded rectangle for servers
				node
					.append('rect')
					.attr('width', dims.width)
					.attr('height', dims.height)
					.attr('x', -dims.width / 2)
					.attr('y', -dims.height / 2)
					.attr('rx', 12)
					.attr('ry', 12)
					.attr('fill', color)
					.attr('stroke', '#fff')
					.attr('stroke-width', 2);

				// Server icon/text
				node
					.append('text')
					.attr('dy', '-5')
					.attr('text-anchor', 'middle')
					.attr('fill', '#fff')
					.attr('font-size', '11px')
					.attr('font-weight', 'bold')
					.text('SERVER');

				// Server name
				node
					.append('text')
					.attr('dy', '8')
					.attr('text-anchor', 'middle')
					.attr('fill', '#fff')
					.attr('font-size', '8px')
					.text(nodeData.name?.substring(0, 10) || 'Server');
			} else {
				// Diamond shape for executors
				const halfWidth = dims.width / 2;
				const halfHeight = dims.height / 2;
				const diamondPath = `M 0,-${halfHeight} L ${halfWidth},0 L 0,${halfHeight} L -${halfWidth},0 Z`;

				node
					.append('path')
					.attr('d', diamondPath)
					.attr('fill', color)
					.attr('stroke', '#fff')
					.attr('stroke-width', 2);

				// Executor icon
				node
					.append('text')
					.attr('dy', '.35em')
					.attr('text-anchor', 'middle')
					.attr('fill', '#fff')
					.attr('font-size', '10px')
					.attr('font-weight', 'bold')
					.text('E');
			}
		});

		nodeSelection
			.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
	}

	function updateLabels() {
		if (!labelGroup || !graphOptions.showLabels) return;

		const labelSelection = labelGroup
			.selectAll<SVGTextElement, GraphNode>('text')
			.data(nodes)
			.join('text')
			.attr('text-anchor', 'middle')
			.attr('dy', d => {
				const dims = getNodeDimensions(d);
				return dims.height / 2 + 20;
			})
			.attr('font-size', '12px')
			.attr('fill', '#374151')
			.text(d => {
				const nodeData = d.data as any;
				return nodeData.name || d.id;
			});

		labelSelection
			.attr('x', d => d.x || 0)
			.attr('y', d => d.y || 0);
	}

	onMount(() => {
		initializeGraph();
	});

	onDestroy(() => {
		// Cleanup if needed
	});
</script>

<div class="colony-graph-container">
	<svg
		bind:this={svgElement}
		{width}
		{height}
		class="colony-graph"
		viewBox="0 0 {width} {height}"
	>
	</svg>

</div>

<style>
	.colony-graph-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
	}

	.colony-graph {
		width: 100%;
		height: 100%;
	}

	:global(.colony-graph .node) {
		transition: opacity 0.2s;
	}

	:global(.colony-graph .node:hover) {
		opacity: 0.8;
	}

	:global(.colony-graph .links line) {
		transition: stroke-opacity 0.2s;
	}
</style>
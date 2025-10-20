<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import type { JobFlowAnimation, ActiveJob, GraphNode } from '$lib/types/colony-graph';

	interface Props {
		svg: d3.Selection<SVGElement, unknown, null, undefined>;
		animations: JobFlowAnimation[];
		nodes: GraphNode[];
		onAnimationComplete?: (animation: JobFlowAnimation) => void;
	}

	let { svg, animations = [], nodes = [], onAnimationComplete }: Props = $props();

	let animationGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let activeAnimations = new Map<string, any>();

	interface AnimationParticle {
		id: string;
		animation: JobFlowAnimation;
		startNode: GraphNode | null;
		endNode: GraphNode | null;
		path: string;
		color: string;
		size: number;
	}

	function getNodePosition(nodeId: string): { x: number; y: number } | null {
		const node = nodes.find(n => n.id === nodeId);
		return node && node.x !== undefined && node.y !== undefined
			? { x: node.x, y: node.y }
			: null;
	}

	function getAnimationColor(type: JobFlowAnimation['type']): string {
		switch (type) {
			case 'assignment': return '#3b82f6'; // Blue - job being assigned
			case 'completion': return '#10b981'; // Green - job completed
			case 'failure': return '#ef4444';   // Red - job failed
			default: return '#6b7280';          // Gray - default
		}
	}

	function getAnimationSize(type: JobFlowAnimation['type']): number {
		switch (type) {
			case 'assignment': return 6;
			case 'completion': return 8;
			case 'failure': return 7;
			default: return 5;
		}
	}

	function createCurvedPath(start: { x: number; y: number }, end: { x: number; y: number }): string {
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const dr = Math.sqrt(dx * dx + dy * dy) * 0.3; // Control point distance

		// Create a curved path using quadratic Bezier curve
		const midX = (start.x + end.x) / 2;
		const midY = (start.y + end.y) / 2;

		// Offset the control point perpendicular to the line
		const angle = Math.atan2(dy, dx) + Math.PI / 2;
		const controlX = midX + Math.cos(angle) * dr;
		const controlY = midY + Math.sin(angle) * dr;

		return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
	}

	function startAnimation(animation: JobFlowAnimation) {
		const startPos = getNodePosition(animation.fromId);
		const endPos = getNodePosition(animation.toId);

		if (!startPos || !endPos) {
			console.warn('Cannot find node positions for animation:', animation);
			return;
		}

		const startNode = nodes.find(n => n.id === animation.fromId) || null;
		const endNode = nodes.find(n => n.id === animation.toId) || null;

		const particle: AnimationParticle = {
			id: animation.id,
			animation,
			startNode,
			endNode,
			path: createCurvedPath(startPos, endPos),
			color: getAnimationColor(animation.type),
			size: getAnimationSize(animation.type)
		};

		// Create particle element
		const particleGroup = animationGroup
			.append('g')
			.attr('class', 'job-particle')
			.attr('id', `particle-${animation.id}`);

		// Add glow effect
		const defs = svg.select('defs');
		if (defs.empty()) {
			svg.append('defs');
		}

		const filter = svg.select('defs')
			.append('filter')
			.attr('id', `glow-${animation.id}`)
			.attr('x', '-50%')
			.attr('y', '-50%')
			.attr('width', '200%')
			.attr('height', '200%');

		filter.append('feGaussianBlur')
			.attr('stdDeviation', 3)
			.attr('result', 'coloredBlur');

		const femerge = filter.append('feMerge');
		femerge.append('feMergeNode').attr('in', 'coloredBlur');
		femerge.append('feMergeNode').attr('in', 'SourceGraphic');

		// Create particle circle
		const circle = particleGroup
			.append('circle')
			.attr('r', particle.size)
			.attr('fill', particle.color)
			.attr('filter', `url(#glow-${animation.id})`)
			.style('opacity', 0);

		// Simplified - no trail effect to improve performance

		// Animate along path
		const pathLength = svg.append('path')
			.attr('d', particle.path)
			.node()!.getTotalLength();

		svg.select('path:last-child').remove(); // Remove temporary path

		const duration = animation.duration || 2000;

		// Simple fade in
		circle.transition()
			.duration(200)
			.style('opacity', 1);

		// Main animation along path
		const animationTransition = circle
			.transition()
			.duration(duration)
			.ease(d3.easeLinear)
			.attrTween('transform', () => {
				const interpolate = d3.interpolate(0, pathLength);
				const path = svg.append('path').attr('d', particle.path);
				const pathNode = path.node()!;

				return (t: number) => {
					const point = pathNode.getPointAtLength(interpolate(t));
					return `translate(${point.x}, ${point.y})`;
				};
			})
			.on('end', () => {
				// Completion effect
				if (animation.type === 'completion') {
					// Success pulse
					circle
						.transition()
						.duration(300)
						.attr('r', particle.size * 1.5)
						.style('opacity', 0.8)
						.transition()
						.duration(300)
						.attr('r', particle.size)
						.style('opacity', 0)
						.on('end', () => {
							cleanupAnimation(animation.id);
							onAnimationComplete?.(animation);
						});
				} else if (animation.type === 'failure') {
					// Failure flash
					circle
						.transition()
						.duration(150)
						.style('opacity', 0.3)
						.transition()
						.duration(150)
						.style('opacity', 1)
						.transition()
						.duration(150)
						.style('opacity', 0.3)
						.transition()
						.duration(150)
						.style('opacity', 0)
						.on('end', () => {
							cleanupAnimation(animation.id);
							onAnimationComplete?.(animation);
						});
				} else {
					// Default fade out
					circle
						.transition()
						.duration(500)
						.style('opacity', 0)
						.on('end', () => {
							cleanupAnimation(animation.id);
							onAnimationComplete?.(animation);
						});
				}

				// Clean up temporary path
				path.remove();
			});

		// Store animation reference for potential cleanup
		activeAnimations.set(animation.id, {
			transition: animationTransition,
			element: particleGroup,
			particle
		});
	}

	function cleanupAnimation(animationId: string) {
		const animation = activeAnimations.get(animationId);
		if (animation) {
			animation.element.remove();
			svg.select(`#glow-${animationId}`).remove();
			activeAnimations.delete(animationId);
		}
	}

	function stopAnimation(animationId: string) {
		const animation = activeAnimations.get(animationId);
		if (animation) {
			animation.transition.interrupt();
			cleanupAnimation(animationId);
		}
	}

	function stopAllAnimations() {
		activeAnimations.forEach((_, id) => stopAnimation(id));
	}

	// Initialize animation group
	$effect(() => {
		if (svg && !animationGroup) {
			animationGroup = svg.append('g').attr('class', 'job-animations');
		}
	});

	// Handle new animations
	$effect(() => {
		const timeoutIds: ReturnType<typeof setTimeout>[] = [];

		if (animations && animationGroup) {
			animations.forEach(animation => {
				if (!activeAnimations.has(animation.id)) {
					// Delay start based on animation start time
					const delay = Math.max(0, animation.startTime - Date.now());
					const timeoutId = setTimeout(() => {
						if (activeAnimations.has(animation.id)) return; // Check if still needed
						startAnimation(animation);
					}, delay);
					timeoutIds.push(timeoutId);
				}
			});
		}

		// Cleanup function to clear all pending timeouts
		return () => {
			timeoutIds.forEach(id => clearTimeout(id));
		};
	});

	// Cleanup on destroy
	onDestroy(() => {
		stopAllAnimations();
		if (animationGroup) {
			animationGroup.remove();
		}
	});

	// Expose methods for external control
	export function addAnimation(animation: JobFlowAnimation) {
		if (!activeAnimations.has(animation.id)) {
			startAnimation(animation);
		}
	}

	export function removeAnimation(animationId: string) {
		stopAnimation(animationId);
	}

	export function clearAllAnimations() {
		stopAllAnimations();
	}
</script>
<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'busy': return '⚡';
			case 'idle':
			case 'online': return '✓';
			case 'offline': return '○';
			default: return '•';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'busy': return '#f97316';
			case 'idle':
			case 'online': return '#10b981';
			case 'offline': return '#6b7280';
			default: return '#6b7280';
		}
	}
</script>

<div class="executor-node" onclick={data.onClick} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && data.onClick?.()} role="button" tabindex="0">
	<Handle type="target" position={Position.Top} />
	<div class="node-icon">⚙️</div>
	<div class="node-label">{data.executor.name}</div>
	<div class="node-status" style="color: {getStatusColor(data.executor.status)};">
		{getStatusIcon(data.executor.status)} {data.executor.status}
	</div>
	{#if data.executor.processCount !== undefined && data.executor.processCount > 0}
		<div class="node-badge">
			{data.executor.processCount} job{data.executor.processCount !== 1 ? 's' : ''}
		</div>
	{/if}
</div>

<style>
	.executor-node {
		padding: 12px 16px;
		border-radius: 8px;
		background: white;
		border: 2px solid #3b82f6;
		min-width: 120px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .executor-node {
		background: #1e293b;
		border-color: #60a5fa;
	}

	.executor-node:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.node-icon {
		font-size: 24px;
		text-align: center;
		margin-bottom: 4px;
	}

	.node-label {
		font-size: 13px;
		font-weight: 600;
		text-align: center;
		color: #1e293b;
		margin-bottom: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dark) .node-label {
		color: #f1f5f9;
	}

	.node-status {
		font-size: 10px;
		text-align: center;
		font-weight: 500;
		margin-bottom: 4px;
	}

	.node-badge {
		font-size: 10px;
		text-align: center;
		padding: 2px 6px;
		background: #eff6ff;
		color: #1e40af;
		border-radius: 4px;
		font-weight: 500;
	}

	:global(.dark) .node-badge {
		background: #1e3a8a;
		color: #93c5fd;
	}
</style>

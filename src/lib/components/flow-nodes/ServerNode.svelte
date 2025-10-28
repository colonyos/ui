<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();
</script>

<div class="server-node" onclick={data.onClick} role="button" tabindex="0">
	<div class="node-icon">🖥️</div>
	<div class="node-label">{data.server.name}</div>
	<div class="node-sublabel">{data.server.host}:{data.server.port}</div>
	<div class="node-sublabel">{data.executorCount} executor{data.executorCount !== 1 ? 's' : ''}</div>
	<Handle type="source" position={Position.Bottom} />
</div>

<style>
	.server-node {
		padding: 12px 16px;
		border-radius: 8px;
		background: white;
		border: 2px solid #10b981;
		min-width: 120px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .server-node {
		background: #1e293b;
		border-color: #34d399;
	}

	.server-node:hover {
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
		margin-bottom: 2px;
	}

	:global(.dark) .node-label {
		color: #f1f5f9;
	}

	.node-sublabel {
		font-size: 10px;
		text-align: center;
		color: #64748b;
	}

	:global(.dark) .node-sublabel {
		color: #94a3b8;
	}
</style>

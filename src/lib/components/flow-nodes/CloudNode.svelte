<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
</script>

<div class="cloud-node">
	<Handle type="target" position={Position.Top} />
	<svg class="cloud-icon" viewBox="0 0 24 24" fill="currentColor">
		<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
	</svg>
	<Handle type="source" position={Position.Bottom} />
</div>

<style>
	.cloud-node {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
	}

	.cloud-icon {
		width: 80px;
		height: 80px;
		color: #60a5fa;
		filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3));
		transition: transform 0.2s ease;
	}

	:global(.dark) .cloud-icon {
		color: #93c5fd;
		filter: drop-shadow(0 4px 8px rgba(96, 165, 250, 0.4));
	}

	.cloud-node:hover .cloud-icon {
		transform: scale(1.1);
	}
</style>

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// Vite automatically exposes VITE_* environment variables from .env files
	// No manual configuration needed
});

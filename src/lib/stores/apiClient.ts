import { derived } from 'svelte/store';
import { ColonyClient } from '$lib/api/colony';
import { appState } from './appState';

// Derived store that creates a ColonyClient based on the colonies endpoint
export const colonyClient = derived(
	appState,
	($appState) => {
		if ($appState.colonies) {
			return new ColonyClient($appState.colonies);
		}
		return null;
	}
);

// Helper function to get the current client (for use in non-reactive contexts)
export function getCurrentColonyClient(): ColonyClient | null {
	let client: ColonyClient | null = null;
	const unsubscribe = colonyClient.subscribe(value => {
		client = value;
	});
	unsubscribe();
	return client;
}
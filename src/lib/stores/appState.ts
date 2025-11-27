import { writable } from 'svelte/store';
import { ColonyEndpoint } from '$lib/api/colony';
import { envConfig } from '$lib/config/env';

export interface AppState {
	// Colony connection variables
	colonyName: string;
	colonyPrvKey: string;
	prvKey: string; // General private key
	executorId: string;
	executorPrvKey: string;
	serverId: string;
	serverPrvKey: string;
	host: string;
	port: string;
	tls: string;
	
	// User information
	username: string;
	firstname: string;
	lastname: string; // Fixed typo from "lastlame"
	email: string;
	
	// AWS S3 configuration
	awsS3Endpoint: string;
	awsS3Accesskey: string;
	awsS3Secretkey: string;
	awsS3Region: string;
	awsS3Bucket: string;
	awsS3TLS: string;
	awsS3SkipVerify: string;
	
	// Colony endpoint
	colonies: ColonyEndpoint | null;

	// UI state
	sidebarCollapsed: string; // 'true' or 'false' as string
	currentTheme: string;
	
	// Connection state
	connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
	connectionError: string;
	
	// Application metadata
	appVersion: string;
	environment: string;
}

// Default state
const defaultState: AppState = {
	// Colony connection variables
	colonyName: '',
	colonyPrvKey: '',
	prvKey: '',
	executorId: '',
	executorPrvKey: '',
	serverId: '',
	serverPrvKey: '',
	host: '',
	port: '443',
	tls: 'true',
	
	// User information
	username: '',
	firstname: '',
	lastname: '',
	email: '',
	
	// AWS S3 configuration
	awsS3Endpoint: '',
	awsS3Accesskey: '',
	awsS3Secretkey: '',
	awsS3Region: '',
	awsS3Bucket: '',
	awsS3TLS: '',
	awsS3SkipVerify: '',
	
	// Colony endpoint
	colonies: null,

	// UI state
	sidebarCollapsed: 'false',
	currentTheme: 'light',
	
	// Connection state
	connectionStatus: 'idle',
	connectionError: '',
	
	// Application metadata
	appVersion: '1.0.0',
	environment: 'development'
};

// Create the writable store
export const appState = writable<AppState>(defaultState);

// Helper functions for common operations
export const appStateActions = {
	// Colony connection management
	setColonyConnection: (colonyName: string, colonyPrvKey: string, host: string, port: string, tls: string) => {
		appState.update(state => ({
			...state,
			colonyName,
			colonyPrvKey,
			host,
			port,
			tls,
			colonies: new ColonyEndpoint(host, port)
		}));
	},

	// UI state
	toggleSidebar: () => {
		appState.update(state => ({
			...state,
			sidebarCollapsed: state.sidebarCollapsed === 'true' ? 'false' : 'true'
		}));
	},

	setTheme: (theme: string) => {
		appState.update(state => ({
			...state,
			currentTheme: theme
		}));
	},

	// Connection state management
	setConnectionStatus: (status: 'idle' | 'connecting' | 'connected' | 'error', error: string = '') => {
		appState.update(state => ({
			...state,
			connectionStatus: status,
			connectionError: error
		}));
	},

	// Reset state
	reset: () => {
		appState.set(defaultState);
	},

	// Load from environment variables and localStorage (for persistence)
	loadFromConfig: async () => {
		// Start with environment variables (build-time config)
		console.log('Loading environment configuration:', {
			host: envConfig.host || '(not set)',
			port: envConfig.port || '(not set)',
			colonyName: envConfig.colonyName || '(not set)',
			tls: envConfig.tls
		});
		
		appState.update(state => ({
			...state,
			...envConfig,
			colonies: envConfig.host && envConfig.port ? new ColonyEndpoint(envConfig.host, envConfig.port) : null
		}));

		// Override with localStorage if enabled and available (user preferences)
		if (envConfig.useLocalStorage && typeof window !== 'undefined') {
			const stored = localStorage.getItem('cop-pilot-app-state');
			if (stored) {
				try {
					const parsedState = JSON.parse(stored);
					appState.update(state => ({
						...state,
						...parsedState
					}));
				} catch (e) {
					console.warn('Failed to load app state from localStorage:', e);
				}
			}
		}
	},

	// Load from localStorage (for persistence)
	loadFromStorage: () => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('cop-pilot-app-state');
			if (stored) {
				try {
					const parsedState = JSON.parse(stored);
					appState.update(state => ({
						...state,
						...parsedState
					}));
				} catch (e) {
					console.warn('Failed to load app state from localStorage:', e);
				}
			}
		}
	},

	// Save to localStorage with debouncing
	saveToStorage: (() => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		return (state: AppState) => {
			if (envConfig.useLocalStorage && typeof window !== 'undefined') {
				// Debounce saves to avoid excessive localStorage writes
				if (timeoutId) clearTimeout(timeoutId);

				timeoutId = setTimeout(() => {
					try {
						localStorage.setItem('cop-pilot-app-state', JSON.stringify(state));
					} catch (e) {
						console.warn('Failed to save app state to localStorage:', e);
					}
				}, 100);
			}
		};
	})()
};
import { dev } from '$app/environment';

// Environment configuration that can be set at build time with VITE_COLONIES_ prefix
export const envConfig = {
	// Colony connection variables
	colonyName: import.meta.env.VITE_COLONIES_COLONY_NAME || '',
	colonyPrvKey: import.meta.env.VITE_COLONIES_PRVKEY || '',
	prvKey: import.meta.env.VITE_COLONIES_PRVKEY || '', // General private key (same as colony for now)
	executorId: import.meta.env.VITE_COLONIES_EXECUTOR_ID || '',
	executorPrvKey: import.meta.env.VITE_COLONIES_EXECUTOR_PRVKEY || '',
	serverId: import.meta.env.VITE_COLONIES_SERVER_ID || '',
	serverPrvKey: import.meta.env.VITE_COLONIES_SERVER_PRVKEY || '',
	host: import.meta.env.VITE_COLONIES_SERVER_HOST || '',
	port: import.meta.env.VITE_COLONIES_SERVER_PORT || '',
	tls: import.meta.env.VITE_COLONIES_SERVER_TLS || 'false',
	
	// User information
	username: import.meta.env.VITE_COLONIES_USERNAME || '',
	firstname: import.meta.env.VITE_COLONIES_FIRSTNAME || '',
	lastname: import.meta.env.VITE_COLONIES_LASTNAME || '',
	email: import.meta.env.VITE_COLONIES_EMAIL || '',
	
	// AWS S3 configuration
	awsS3Endpoint: import.meta.env.VITE_AWS_S3_ENDPOINT || '',
	awsS3Accesskey: import.meta.env.VITE_AWS_S3_ACCESSKEY || '',
	awsS3Secretkey: import.meta.env.VITE_AWS_S3_SECRETKEY || '',
	awsS3Region: import.meta.env.VITE_AWS_S3_REGION || 'us-east-1',
	awsS3Bucket: import.meta.env.VITE_AWS_S3_BUCKET || '',
	awsS3TLS: import.meta.env.VITE_AWS_S3_TLS || 'true',
	awsS3SkipVerify: import.meta.env.VITE_AWS_S3_SKIPVERIFY || 'false',
	
	// UI state
	currentTheme: import.meta.env.VITE_COLONIES_THEME || 'dark',

	// Application metadata
	environment: dev ? 'development' : 'production',
	appVersion: import.meta.env.VITE_COLONIES_APP_VERSION || '1.0.0',

	// Storage settings
	useLocalStorage: import.meta.env.VITE_COLONIES_USE_LOCALSTORAGE === 'true' || false
};
// Re-export from colonies-ts adapter for backward compatibility
export { ColoniesClientAdapter as ColonyClient } from './coloniesClientAdapter';
export { Crypto } from 'colonies-ts';
export type { RPCMessage } from 'colonies-ts';
export { ProcessState } from '$lib/types/process';

// Additional process state constant for removeAllProcesses
export const PROCESS_STATE_NOTSET = -1;

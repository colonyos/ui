import type { GPU } from './executor';

export interface SnapshotMount {
	snapshotid: string;
	label: string;
	dir: string;
	keepfiles: boolean;
	keepsnapshot: boolean;
}

export interface OnStart {
	keeplocal: boolean;
}

export interface OnClose {
	keeplocal: boolean;
}

export interface ConflictResolution {
	onstart: OnStart;
	onclose: OnClose;
}

export interface SyncDirMount {
	label: string;
	dir: string;
	keepfiles: boolean;
	onconflicts: ConflictResolution;
}

export interface Filesystem {
	mount: string;
	snapshots: SnapshotMount[];
	dirs: SyncDirMount[];
}

export interface Conditions {
	colonyname: string;
	executornames: string[];
	executortype: string;
	dependencies: string[];
	nodes: number;
	cpu: string;
	processes: number;
	processespernode: number;
	mem: string;
	storage: string;
	gpu: GPU;
	walltime: number;
}

export interface FunctionSpec {
	nodename: string;
	funcname: string;
	args: any[];
	kwargs: Record<string, any>;
	priority: number;
	maxwaittime: number;
	maxexectime: number;
	maxretries: number;
	conditions: Conditions;
	label: string;
	fs: Filesystem;
	env: Record<string, string>;
}
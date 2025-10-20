export interface Location {
	long: number;
	lat: number;
	desc: string;
}

export interface GPU {
	name: string;
	mem: string;
	count: number;
	nodecount: number;
}

export interface Software {
	name: string;
	type: string;
	version: string;
}

export interface Hardware {
	model: string;
	nodes: number;
	cpu: string;
	mem: string;
	storage: string;
	gpu: GPU;
}

export interface Capabilities {
	hardware: Hardware;
	software: Software;
}

export interface Project {
	allocatedcpu: number;
	usedcpu: number;
	allocatedgpu: number;
	usedgpu: number;
	allocatedstorage: number;
	usedstorage: number;
}

export interface Allocations {
	projects: Record<string, Project>;
}

export interface Executor {
	executorid: string;
	executortype: string;
	executorname: string;
	colonyname: string;
	state: number;
	requirefuncreg: boolean;
	commissiontime: string;
	lastheardfromtime: string;
	location: Location;
	capabilities: Capabilities;
	allocations: Allocations;
}

export enum ExecutorState {
	Pending = 0,
	Approved = 1,
	Rejected = 2
}

export function getExecutorStateLabel(state: number): string {
	switch (state) {
		case ExecutorState.Pending:
			return 'Pending';
		case ExecutorState.Approved:
			return 'Approved';
		case ExecutorState.Rejected:
			return 'Rejected';
		default:
			return 'Unknown';
	}
}

export function getExecutorStateColor(state: number): string {
	switch (state) {
		case ExecutorState.Pending:
			return 'text-yellow-600 bg-yellow-100';
		case ExecutorState.Approved:
			return 'text-green-600 bg-green-100';
		case ExecutorState.Rejected:
			return 'text-red-600 bg-red-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
}
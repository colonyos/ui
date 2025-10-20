import type { FunctionSpec } from './functionspec';

export interface Attribute {
	attributeid: string;
	targetid: string;
	targetcolonyname: string;
	targetprocessgraphid: string;
	state: number;
	attributetype: number;
	key: string;
	value: string;
}

export interface Process {
	processid: string;
	initiatorid: string;
	initiatorname: string;
	assignedexecutorid: string;
	isassigned: boolean;
	state: number;
	prioritytime: number;
	submissiontime: string;
	starttime: string;
	endtime: string;
	waitdeadline: string;
	execdeadline: string;
	retries: number;
	attributes: Attribute[];
	spec: FunctionSpec;
	waitforparents: boolean;
	parents: string[];
	children: string[];
	processgraphid: string;
	in: any[];
	out: any[];
	errors: string[];
}

export enum ProcessState {
	WAITING = 0,
	RUNNING = 1,
	SUCCESS = 2,
	FAILED = 3
}

export enum AttributeState {
	Unknown = 0,
	Active = 1,
	Inactive = 2,
	Pending = 3,
	Expired = 4
}

export enum AttributeType {
	IN = 0,
	OUT = 1,
	ERR = 2,
	ENV = 3
}

export function getProcessStateLabel(state: number): string {
	switch (state) {
		case ProcessState.WAITING:
			return 'Waiting';
		case ProcessState.RUNNING:
			return 'Running';
		case ProcessState.SUCCESS:
			return 'Success';
		case ProcessState.FAILED:
			return 'Failed';
		default:
			return 'Unknown';
	}
}

export function getProcessStateColor(state: number): string {
	switch (state) {
		case ProcessState.WAITING:
			return 'text-yellow-600 bg-yellow-100';
		case ProcessState.RUNNING:
			return 'text-blue-600 bg-blue-100';
		case ProcessState.SUCCESS:
			return 'text-green-600 bg-green-100';
		case ProcessState.FAILED:
			return 'text-red-600 bg-red-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
}

export function getAttributeStateLabel(state: number): string {
	switch (state) {
		case AttributeState.Active:
			return 'Active';
		case AttributeState.Inactive:
			return 'Inactive';
		case AttributeState.Pending:
			return 'Pending';
		case AttributeState.Expired:
			return 'Expired';
		default:
			return 'Unknown';
	}
}

export function getAttributeStateColor(state: number): string {
	switch (state) {
		case AttributeState.Active:
			return 'text-green-600 bg-green-100';
		case AttributeState.Inactive:
			return 'text-gray-600 bg-gray-100';
		case AttributeState.Pending:
			return 'text-yellow-600 bg-yellow-100';
		case AttributeState.Expired:
			return 'text-red-600 bg-red-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
}

export function getAttributeTypeLabel(type: number): string {
	switch (type) {
		case AttributeType.IN:
			return 'Input';
		case AttributeType.OUT:
			return 'Output';
		case AttributeType.ERR:
			return 'Error';
		case AttributeType.ENV:
			return 'Environment';
		default:
			return 'Unknown';
	}
}

export function getAttributeTypeColor(type: number): string {
	switch (type) {
		case AttributeType.IN:
			return 'text-blue-600 bg-blue-100';
		case AttributeType.OUT:
			return 'text-green-600 bg-green-100';
		case AttributeType.ERR:
			return 'text-red-600 bg-red-100';
		case AttributeType.ENV:
			return 'text-purple-600 bg-purple-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
}
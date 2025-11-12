export interface BlueprintMetadata {
	name: string;
	namespace?: string;
	labels?: Record<string, string>;
	annotations?: Record<string, string>;
	generation?: number;
	createdAt?: string;
	updatedAt?: string;
	lastReconciliationProcess?: string;
	lastReconciliationTime?: string;
}

export interface Blueprint {
	blueprintid: string;
	kind: string;
	metadata: BlueprintMetadata;
	spec: Record<string, unknown>;
	status?: Record<string, unknown>;
}

// Blueprint Definition (CRD/Template)
export interface BlueprintDefinition {
	blueprintdefinitionid: string;
	kind: string;
	metadata: BlueprintMetadata;
	spec: Record<string, unknown>;
}

export interface AddBlueprintMsg {
	blueprint: Blueprint;
	msgtype: string;
}

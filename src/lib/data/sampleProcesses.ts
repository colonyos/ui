import type { Process } from '$lib/types/process';
import { ProcessState, AttributeState, AttributeType } from '$lib/types/process';
import { sampleFunctionSpecs } from './sampleFunctionSpecs';

export const sampleProcesses: Process[] = [
	{
		processid: 'proc-001',
		initiatorid: 'init-001',
		initiatorname: 'Data Processing Service',
		assignedexecutorid: 'exec-001',
		isassigned: true,
		state: ProcessState.RUNNING,
		prioritytime: 1725286800000, // Sep 2, 2025 12:00:00 UTC
		submissiontime: '2025-09-02T12:00:00Z',
		starttime: '2025-09-02T12:05:00Z',
		endtime: '0001-01-01T00:00:00Z',
		waitdeadline: '2025-09-02T13:00:00Z',
		execdeadline: '2025-09-02T14:00:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-001',
				targetid: 'proc-001',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'high'
			},
			{
				attributeid: 'attr-002',
				targetid: 'proc-001',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.ENV,
				key: 'department',
				value: 'analytics'
			},
			{
				attributeid: 'attr-003',
				targetid: 'proc-001',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.OUT,
				key: 'cost_center',
				value: 'CC-001'
			}
		],
		spec: sampleFunctionSpecs[0], // data processing spec
		waitforparents: false,
		parents: [],
		children: ['proc-002', 'proc-003'],
		processgraphid: 'graph-001',
		in: ['input_dataset.csv', 1000],
		out: [],
		errors: []
	},
	{
		processid: 'proc-002',
		initiatorid: 'init-002',
		initiatorname: 'ML Training Pipeline',
		assignedexecutorid: 'exec-002',
		isassigned: true,
		state: ProcessState.SUCCESS,
		prioritytime: 1725283200000, // Sep 2, 2025 11:00:00 UTC
		submissiontime: '2025-09-02T11:00:00Z',
		starttime: '2025-09-02T11:15:00Z',
		endtime: '2025-09-02T15:30:00Z',
		waitdeadline: '2025-09-02T12:00:00Z',
		execdeadline: '2025-09-02T23:00:00Z',
		retries: 1,
		attributes: [
			{
				attributeid: 'attr-004',
				targetid: 'proc-002',
				targetcolonyname: 'ai-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'medium'
			},
			{
				attributeid: 'attr-005',
				targetid: 'proc-002',
				targetcolonyname: 'ai-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.ENV,
				key: 'model_type',
				value: 'neural_network'
			},
			{
				attributeid: 'attr-006',
				targetid: 'proc-002',
				targetcolonyname: 'ai-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.OUT,
				key: 'gpu_required',
				value: 'true'
			}
		],
		spec: sampleFunctionSpecs[1], // ML training spec
		waitforparents: true,
		parents: ['proc-001'],
		children: ['proc-004'],
		processgraphid: 'graph-001',
		in: ['model_config.json'],
		out: ['trained_model_v1.2.pkl', 'training_metrics.json'],
		errors: []
	},
	{
		processid: 'proc-003',
		initiatorid: 'init-003',
		initiatorname: 'System Monitoring',
		assignedexecutorid: 'exec-003',
		isassigned: true,
		state: ProcessState.FAILED,
		prioritytime: 1725290400000, // Sep 2, 2025 13:00:00 UTC
		submissiontime: '2025-09-02T13:00:00Z',
		starttime: '2025-09-02T13:10:00Z',
		endtime: '2025-09-02T13:25:00Z',
		waitdeadline: '2025-09-02T14:00:00Z',
		execdeadline: '2025-09-02T14:10:00Z',
		retries: 3,
		attributes: [
			{
				attributeid: 'attr-007',
				targetid: 'proc-003',
				targetcolonyname: 'media-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Expired,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'low'
			},
			{
				attributeid: 'attr-008',
				targetid: 'proc-003',
				targetcolonyname: 'media-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.ERR,
				key: 'monitoring_type',
				value: 'health_check'
			},
			{
				attributeid: 'attr-009',
				targetid: 'proc-003',
				targetcolonyname: 'media-colony',
				targetprocessgraphid: 'graph-001',
				state: AttributeState.Active,
				attributetype: AttributeType.ENV,
				key: 'auto_retry',
				value: 'true'
			}
		],
		spec: sampleFunctionSpecs[2], // image processing spec
		waitforparents: true,
		parents: ['proc-001'],
		children: [],
		processgraphid: 'graph-001',
		in: ['/input/images', '/output/processed'],
		out: [],
		errors: [
			'Failed to connect to image processing service',
			'Timeout after 900 seconds',
			'Max retries exceeded'
		]
	},
	{
		processid: 'proc-004',
		initiatorid: 'init-004',
		initiatorname: 'Log Aggregation Service',
		assignedexecutorid: '',
		isassigned: false,
		state: ProcessState.WAITING,
		prioritytime: 1725294000000, // Sep 2, 2025 14:00:00 UTC
		submissiontime: '2025-09-02T14:00:00Z',
		starttime: '0001-01-01T00:00:00Z',
		endtime: '0001-01-01T00:00:00Z',
		waitdeadline: '2025-09-02T15:00:00Z',
		execdeadline: '2025-09-02T18:00:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-010',
				targetid: 'proc-004',
				targetcolonyname: 'backup-colony',
				targetprocessgraphid: 'graph-002',
				state: AttributeState.Pending,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'medium'
			},
			{
				attributeid: 'attr-011',
				targetid: 'proc-004',
				targetcolonyname: 'backup-colony',
				targetprocessgraphid: 'graph-002',
				state: AttributeState.Pending,
				attributetype: AttributeType.ENV,
				key: 'backup_type',
				value: 'incremental'
			},
			{
				attributeid: 'attr-012',
				targetid: 'proc-004',
				targetcolonyname: 'backup-colony',
				targetprocessgraphid: 'graph-002',
				state: AttributeState.Pending,
				attributetype: AttributeType.ENV,
				key: 'compression',
				value: 'enabled'
			}
		],
		spec: sampleFunctionSpecs[3], // backup spec
		waitforparents: true,
		parents: ['proc-002'],
		children: [],
		processgraphid: 'graph-002',
		in: ['/data/production', '/backups/daily'],
		out: [],
		errors: []
	},
	{
		processid: 'proc-005',
		initiatorid: 'init-005',
		initiatorname: 'Resource Optimizer',
		assignedexecutorid: 'exec-004',
		isassigned: true,
		state: ProcessState.FAILED,
		prioritytime: 1725280800000, // Sep 2, 2025 10:20:00 UTC
		submissiontime: '2025-09-02T10:20:00Z',
		starttime: '2025-09-02T10:25:00Z',
		endtime: '2025-09-02T10:45:00Z',
		waitdeadline: '2025-09-02T11:20:00Z',
		execdeadline: '2025-09-02T12:20:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-013',
				targetid: 'proc-005',
				targetcolonyname: 'analytics-colony',
				targetprocessgraphid: 'graph-003',
				state: AttributeState.Inactive,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'high'
			},
			{
				attributeid: 'attr-014',
				targetid: 'proc-005',
				targetcolonyname: 'analytics-colony',
				targetprocessgraphid: 'graph-003',
				state: AttributeState.Inactive,
				attributetype: AttributeType.ENV,
				key: 'report_format',
				value: 'pdf'
			},
			{
				attributeid: 'attr-015',
				targetid: 'proc-005',
				targetcolonyname: 'analytics-colony',
				targetprocessgraphid: 'graph-003',
				state: AttributeState.Inactive,
				attributetype: AttributeType.ENV,
				key: 'email_enabled',
				value: 'true'
			}
		],
		spec: sampleFunctionSpecs[4], // analytics spec
		waitforparents: false,
		parents: [],
		children: [],
		processgraphid: 'graph-003',
		in: ['2025-09-01', '2025-09-02'],
		out: [],
		errors: ['Process killed by user request']
	},
	{
		processid: 'proc-006',
		initiatorid: 'init-006',
		initiatorname: 'Security Scanner',
		assignedexecutorid: 'exec-001',
		isassigned: true,
		state: ProcessState.RUNNING,
		prioritytime: 1725297600000, // Sep 2, 2025 15:00:00 UTC
		submissiontime: '2025-09-02T15:00:00Z',
		starttime: '2025-09-02T15:05:00Z',
		endtime: '0001-01-01T00:00:00Z',
		waitdeadline: '2025-09-02T16:00:00Z',
		execdeadline: '2025-09-02T17:00:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-016',
				targetid: 'proc-006',
				targetcolonyname: 'security-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'high'
			},
			{
				attributeid: 'attr-017',
				targetid: 'proc-006',
				targetcolonyname: 'security-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.ERR,
				key: 'scan_type',
				value: 'vulnerability'
			},
			{
				attributeid: 'attr-018',
				targetid: 'proc-006',
				targetcolonyname: 'security-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.ERR,
				key: 'security_level',
				value: 'comprehensive'
			}
		],
		spec: sampleFunctionSpecs[0], // reuse data processing spec
		waitforparents: false,
		parents: [],
		children: ['proc-007', 'proc-008'],
		processgraphid: 'graph-004',
		in: ['security_config.json', 'target_systems.list'],
		out: [],
		errors: []
	},
	{
		processid: 'proc-007',
		initiatorid: 'init-007',
		initiatorname: 'Database Maintenance',
		assignedexecutorid: '',
		isassigned: false,
		state: ProcessState.WAITING,
		prioritytime: 1725301200000, // Sep 2, 2025 16:00:00 UTC
		submissiontime: '2025-09-02T16:00:00Z',
		starttime: '0001-01-01T00:00:00Z',
		endtime: '0001-01-01T00:00:00Z',
		waitdeadline: '2025-09-02T17:00:00Z',
		execdeadline: '2025-09-02T20:00:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-019',
				targetid: 'proc-007',
				targetcolonyname: 'data-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Pending,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'low'
			},
			{
				attributeid: 'attr-020',
				targetid: 'proc-007',
				targetcolonyname: 'data-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Pending,
				attributetype: AttributeType.ENV,
				key: 'maintenance_type',
				value: 'index_optimization'
			},
			{
				attributeid: 'attr-021',
				targetid: 'proc-007',
				targetcolonyname: 'data-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Pending,
				attributetype: AttributeType.OUT,
				key: 'database',
				value: 'production'
			}
		],
		spec: sampleFunctionSpecs[1], // reuse ML training spec
		waitforparents: true,
		parents: ['proc-006'],
		children: [],
		processgraphid: 'graph-004',
		in: ['maintenance_plan.sql'],
		out: [],
		errors: []
	},
	{
		processid: 'proc-008',
		initiatorid: 'init-008',
		initiatorname: 'Data Export Service',
		assignedexecutorid: 'exec-002',
		isassigned: true,
		state: ProcessState.SUCCESS,
		prioritytime: 1725276000000, // Sep 2, 2025 09:00:00 UTC
		submissiontime: '2025-09-02T09:00:00Z',
		starttime: '2025-09-02T09:10:00Z',
		endtime: '2025-09-02T09:45:00Z',
		waitdeadline: '2025-09-02T10:00:00Z',
		execdeadline: '2025-09-02T11:00:00Z',
		retries: 0,
		attributes: [
			{
				attributeid: 'attr-022',
				targetid: 'proc-008',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.IN,
				key: 'priority',
				value: 'medium'
			},
			{
				attributeid: 'attr-023',
				targetid: 'proc-008',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.ENV,
				key: 'export_format',
				value: 'json'
			},
			{
				attributeid: 'attr-024',
				targetid: 'proc-008',
				targetcolonyname: 'main-colony',
				targetprocessgraphid: 'graph-004',
				state: AttributeState.Active,
				attributetype: AttributeType.OUT,
				key: 'destination',
				value: 's3_bucket'
			}
		],
		spec: sampleFunctionSpecs[2], // reuse image processing spec
		waitforparents: true,
		parents: ['proc-006'],
		children: [],
		processgraphid: 'graph-004',
		in: ['export_query.sql', 'config.yaml'],
		out: ['export_2025-09-02.json', 'export_summary.txt'],
		errors: []
	}
];
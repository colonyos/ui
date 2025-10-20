import type { FunctionSpec } from '$lib/types/functionspec';

export const sampleFunctionSpecs: FunctionSpec[] = [
	{
		nodename: 'data-processing-node',
		funcname: 'process_batch_data',
		args: ['input_dataset.csv', 1000],
		kwargs: {
			format: 'csv',
			compression: 'gzip',
			validation: true
		},
		priority: 5,
		maxwaittime: 3600,
		maxexectime: 7200,
		maxretries: 3,
		conditions: {
			colonyname: 'main-colony',
			executornames: ['data-executor-01', 'data-executor-02'],
			executortype: 'container',
			dependencies: ['numpy', 'pandas', 'scikit-learn'],
			nodes: 2,
			cpu: '4 cores',
			processes: 1,
			processespernode: 1,
			mem: '8GB',
			storage: '50GB',
			gpu: {
				name: '',
				mem: '',
				count: 0,
				nodecount: 0
			},
			walltime: 7200
		},
		label: 'Batch Data Processing',
		fs: {
			mount: '/data',
			snapshots: [
				{
					snapshotid: 'snap-001',
					label: 'input-data',
					dir: '/data/input',
					keepfiles: true,
					keepsnapshot: false
				}
			],
			dirs: [
				{
					label: 'temp-workspace',
					dir: '/tmp/workspace',
					keepfiles: false,
					onconflicts: {
						onstart: { keeplocal: false },
						onclose: { keeplocal: false }
					}
				}
			]
		},
		env: {
			PYTHON_PATH: '/usr/local/bin/python',
			DATA_FORMAT: 'csv',
			LOG_LEVEL: 'INFO'
		}
	},
	{
		nodename: 'ml-training-node',
		funcname: 'train_neural_network',
		args: ['model_config.json'],
		kwargs: {
			epochs: 100,
			batch_size: 32,
			learning_rate: 0.001,
			optimizer: 'adam'
		},
		priority: 8,
		maxwaittime: 1800,
		maxexectime: 43200,
		maxretries: 2,
		conditions: {
			colonyname: 'ai-colony',
			executornames: ['gpu-executor-01'],
			executortype: 'kubernetes',
			dependencies: ['tensorflow', 'keras', 'cuda'],
			nodes: 1,
			cpu: '8 cores',
			processes: 1,
			processespernode: 1,
			mem: '32GB',
			storage: '100GB',
			gpu: {
				name: 'NVIDIA A100',
				mem: '40GB HBM2',
				count: 2,
				nodecount: 1
			},
			walltime: 43200
		},
		label: 'Neural Network Training',
		fs: {
			mount: '/workspace',
			snapshots: [
				{
					snapshotid: 'snap-002',
					label: 'training-data',
					dir: '/workspace/data',
					keepfiles: true,
					keepsnapshot: true
				},
				{
					snapshotid: 'snap-003',
					label: 'model-checkpoints',
					dir: '/workspace/checkpoints',
					keepfiles: true,
					keepsnapshot: true
				}
			],
			dirs: [
				{
					label: 'output-models',
					dir: '/workspace/models',
					keepfiles: true,
					onconflicts: {
						onstart: { keeplocal: false },
						onclose: { keeplocal: true }
					}
				}
			]
		},
		env: {
			CUDA_VISIBLE_DEVICES: '0,1',
			TENSORFLOW_CPP_MIN_LOG_LEVEL: '2',
			MODEL_OUTPUT_PATH: '/workspace/models'
		}
	},
	{
		nodename: 'image-processing-node',
		funcname: 'process_images',
		args: ['/input/images', '/output/processed'],
		kwargs: {
			format: 'jpg',
			quality: 85,
			resize: [1920, 1080],
			filters: ['sharpen', 'denoise']
		},
		priority: 3,
		maxwaittime: 900,
		maxexectime: 3600,
		maxretries: 5,
		conditions: {
			colonyname: 'media-colony',
			executornames: [],
			executortype: 'container',
			dependencies: ['opencv', 'pillow', 'imageio'],
			nodes: 1,
			cpu: '2 cores',
			processes: 4,
			processespernode: 4,
			mem: '4GB',
			storage: '20GB',
			gpu: {
				name: 'NVIDIA GTX 1660',
				mem: '6GB GDDR6',
				count: 1,
				nodecount: 1
			},
			walltime: 3600
		},
		label: 'Image Processing Pipeline',
		fs: {
			mount: '/media',
			snapshots: [],
			dirs: [
				{
					label: 'input-images',
					dir: '/input/images',
					keepfiles: true,
					onconflicts: {
						onstart: { keeplocal: true },
						onclose: { keeplocal: false }
					}
				},
				{
					label: 'processed-output',
					dir: '/output/processed',
					keepfiles: true,
					onconflicts: {
						onstart: { keeplocal: false },
						onclose: { keeplocal: true }
					}
				}
			]
		},
		env: {
			OPENCV_VERSION: '4.8.0',
			PROCESSING_THREADS: '4',
			OUTPUT_FORMAT: 'jpg'
		}
	},
	{
		nodename: 'backup-node',
		funcname: 'create_backup',
		args: ['/data/production', '/backups/daily'],
		kwargs: {
			compression: 'lz4',
			encryption: true,
			verify: true,
			incremental: true
		},
		priority: 2,
		maxwaittime: 600,
		maxexectime: 14400,
		maxretries: 1,
		conditions: {
			colonyname: 'backup-colony',
			executornames: ['backup-executor-01', 'backup-executor-02'],
			executortype: 'hpc',
			dependencies: ['rsync', 'tar', 'gpg'],
			nodes: 1,
			cpu: '1 core',
			processes: 1,
			processespernode: 1,
			mem: '2GB',
			storage: '500GB',
			gpu: {
				name: '',
				mem: '',
				count: 0,
				nodecount: 0
			},
			walltime: 14400
		},
		label: 'Daily Backup Job',
		fs: {
			mount: '/backup-workspace',
			snapshots: [
				{
					snapshotid: 'snap-004',
					label: 'source-data',
					dir: '/data/production',
					keepfiles: true,
					keepsnapshot: false
				}
			],
			dirs: [
				{
					label: 'backup-destination',
					dir: '/backups/daily',
					keepfiles: true,
					onconflicts: {
						onstart: { keeplocal: true },
						onclose: { keeplocal: true }
					}
				}
			]
		},
		env: {
			BACKUP_ENCRYPTION_KEY: '/etc/backup/key.gpg',
			COMPRESSION_LEVEL: '6',
			VERIFY_CHECKSUMS: 'true'
		}
	},
	{
		nodename: 'analytics-node',
		funcname: 'generate_analytics_report',
		args: ['2025-09-01', '2025-09-02'],
		kwargs: {
			report_type: 'daily',
			include_charts: true,
			output_format: 'pdf',
			email_recipients: ['admin@company.com']
		},
		priority: 4,
		maxwaittime: 1200,
		maxexectime: 1800,
		maxretries: 2,
		conditions: {
			colonyname: 'analytics-colony',
			executornames: [],
			executortype: 'vm',
			dependencies: ['matplotlib', 'pandas', 'reportlab'],
			nodes: 1,
			cpu: '2 cores',
			processes: 1,
			processespernode: 1,
			mem: '8GB',
			storage: '10GB',
			gpu: {
				name: '',
				mem: '',
				count: 0,
				nodecount: 0
			},
			walltime: 1800
		},
		label: 'Daily Analytics Report',
		fs: {
			mount: '/analytics',
			snapshots: [
				{
					snapshotid: 'snap-005',
					label: 'analytics-data',
					dir: '/analytics/data',
					keepfiles: true,
					keepsnapshot: false
				}
			],
			dirs: [
				{
					label: 'report-output',
					dir: '/analytics/reports',
					keepfiles: true,
					onconflicts: {
						onstart: { keeplocal: false },
						onclose: { keeplocal: true }
					}
				}
			]
		},
		env: {
			REPORT_TEMPLATE_PATH: '/analytics/templates',
			SMTP_SERVER: 'smtp.company.com',
			OUTPUT_DPI: '300'
		}
	}
];
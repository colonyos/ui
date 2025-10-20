import type { Executor } from '$lib/types/executor';
import { ExecutorState } from '$lib/types/executor';

export const sampleExecutors: Executor[] = [
	{
		executorid: 'exec-001',
		executortype: 'container',
		executorname: 'HPC Cluster Alpha',
		colonyname: 'main-colony',
		state: ExecutorState.Approved,
		requirefuncreg: true,
		commissiontime: '2024-01-15T10:30:00Z',
		lastheardfromtime: '2024-01-20T15:45:30Z',
		location: {
			long: -122.4194,
			lat: 37.7749,
			desc: 'San Francisco Data Center'
		},
		capabilities: {
			hardware: {
				model: 'Dell PowerEdge R750',
				nodes: 4,
				cpu: '2x Intel Xeon Gold 6338',
				mem: '256GB DDR4',
				storage: '4TB NVMe SSD',
				gpu: {
					name: 'NVIDIA A100',
					mem: '40GB HBM2',
					count: 8,
					nodecount: 2
				}
			},
			software: {
				name: 'Docker',
				type: 'container-runtime',
				version: '24.0.7'
			}
		},
		allocations: {
			projects: {
				'ml-training': {
					allocatedcpu: 32000,
					usedcpu: 24500,
					allocatedgpu: 4000,
					usedgpu: 3200,
					allocatedstorage: 1000000,
					usedstorage: 750000
				},
				'data-processing': {
					allocatedcpu: 16000,
					usedcpu: 8200,
					allocatedgpu: 2000,
					usedgpu: 800,
					allocatedstorage: 500000,
					usedstorage: 320000
				}
			}
		}
	},
	{
		executorid: 'exec-002',
		executortype: 'kubernetes',
		executorname: 'K8s Production Cluster',
		colonyname: 'main-colony',
		state: ExecutorState.Approved,
		requirefuncreg: false,
		commissiontime: '2024-01-10T08:15:00Z',
		lastheardfromtime: '2024-01-20T15:50:12Z',
		location: {
			long: -73.935242,
			lat: 40.730610,
			desc: 'New York Edge Location'
		},
		capabilities: {
			hardware: {
				model: 'HPE ProLiant DL380',
				nodes: 6,
				cpu: '2x AMD EPYC 7543',
				mem: '512GB DDR4',
				storage: '8TB NVMe SSD',
				gpu: {
					name: 'NVIDIA V100',
					mem: '32GB HBM2',
					count: 4,
					nodecount: 2
				}
			},
			software: {
				name: 'Kubernetes',
				type: 'orchestrator',
				version: '1.28.4'
			}
		},
		allocations: {
			projects: {
				'web-services': {
					allocatedcpu: 48000,
					usedcpu: 36000,
					allocatedgpu: 0,
					usedgpu: 0,
					allocatedstorage: 2000000,
					usedstorage: 1200000
				}
			}
		}
	},
	{
		executorid: 'exec-003',
		executortype: 'hpc',
		executorname: 'Supercomputer Beta',
		colonyname: 'research-colony',
		state: ExecutorState.Pending,
		requirefuncreg: true,
		commissiontime: '2024-01-18T12:00:00Z',
		lastheardfromtime: '2024-01-20T14:30:45Z',
		location: {
			long: 2.3522,
			lat: 48.8566,
			desc: 'Paris Research Facility'
		},
		capabilities: {
			hardware: {
				model: 'Cray EX4000',
				nodes: 128,
				cpu: '4x AMD EPYC 7763',
				mem: '2TB DDR4',
				storage: '100TB Parallel FS',
				gpu: {
					name: 'NVIDIA H100',
					mem: '80GB HBM3',
					count: 512,
					nodecount: 128
				}
			},
			software: {
				name: 'Slurm',
				type: 'workload-manager',
				version: '23.02.7'
			}
		},
		allocations: {
			projects: {
				'climate-modeling': {
					allocatedcpu: 512000,
					usedcpu: 102400,
					allocatedgpu: 256000,
					usedgpu: 51200,
					allocatedstorage: 50000000,
					usedstorage: 15000000
				},
				'genome-analysis': {
					allocatedcpu: 256000,
					usedcpu: 128000,
					allocatedgpu: 128000,
					usedgpu: 76800,
					allocatedstorage: 25000000,
					usedstorage: 18000000
				}
			}
		}
	},
	{
		executorid: 'exec-004',
		executortype: 'container',
		executorname: 'Edge Computing Node',
		colonyname: 'edge-colony',
		state: ExecutorState.Approved,
		requirefuncreg: false,
		commissiontime: '2024-01-05T16:20:00Z',
		lastheardfromtime: '2024-01-20T15:55:18Z',
		location: {
			long: 139.6917,
			lat: 35.6895,
			desc: 'Tokyo Edge Data Center'
		},
		capabilities: {
			hardware: {
				model: 'Intel NUC 12 Pro',
				nodes: 1,
				cpu: '1x Intel Core i7-1260P',
				mem: '32GB DDR4',
				storage: '1TB NVMe SSD',
				gpu: {
					name: 'Intel Iris Xe',
					mem: '8GB',
					count: 1,
					nodecount: 1
				}
			},
			software: {
				name: 'Podman',
				type: 'container-runtime',
				version: '4.7.2'
			}
		},
		allocations: {
			projects: {
				'iot-processing': {
					allocatedcpu: 8000,
					usedcpu: 4800,
					allocatedgpu: 1000,
					usedgpu: 600,
					allocatedstorage: 500000,
					usedstorage: 200000
				}
			}
		}
	},
	{
		executorid: 'exec-005',
		executortype: 'vm',
		executorname: 'Legacy System',
		colonyname: 'main-colony',
		state: ExecutorState.Rejected,
		requirefuncreg: true,
		commissiontime: '2024-01-12T09:45:00Z',
		lastheardfromtime: '2024-01-19T10:15:22Z',
		location: {
			long: -87.6298,
			lat: 41.8781,
			desc: 'Chicago Backup Facility'
		},
		capabilities: {
			hardware: {
				model: 'IBM Power Systems',
				nodes: 2,
				cpu: '2x POWER9',
				mem: '128GB DDR4',
				storage: '2TB SAS HDD',
				gpu: {
					name: '',
					mem: '',
					count: 0,
					nodecount: 0
				}
			},
			software: {
				name: 'VMware vSphere',
				type: 'hypervisor',
				version: '7.0'
			}
		},
		allocations: {
			projects: {}
		}
	}
];
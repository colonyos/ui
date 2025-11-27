import type { ColonyGraphData, ColonyServer, ColonyExecutor, ColonyConnection, ActiveJob, JobFlowAnimation } from '$lib/types/colony-graph';
import { envConfig } from '$lib/config/env';

export interface ColonyAPIData {
	colonies: any[];
	executors: any[];
	processes: any[];
	serverStatus: any;
}

export function transformColonyAPIToGraphData(apiData: ColonyAPIData): ColonyGraphData {
	const servers: ColonyServer[] = [];
	const executors: ColonyExecutor[] = [];
	const connections: ColonyConnection[] = [];
	const activeJobs: ActiveJob[] = [];

	// Transform colonies to servers
	if (apiData.colonies && Array.isArray(apiData.colonies)) {
		apiData.colonies.forEach((colony, index) => {
			const server: ColonyServer = {
				id: colony.name || `server-${index}`,
				name: colony.name || `Colony ${index + 1}`,
				host: envConfig.host,
				port: envConfig.port,
				status: 'online', // Default, could be enhanced with actual status
				processCount: 0
			};
			servers.push(server);
		});
	}

	// Transform executors
	if (apiData.executors && Array.isArray(apiData.executors)) {
		apiData.executors.forEach((executor) => {
			// Match executor to server by colony name
			const colonyName = executor.colonyname || executor.colony_name;
			const matchingServer = servers.find(s => s.id === colonyName);
			const serverId = matchingServer ? matchingServer.id : (servers[0]?.id || 'default-server');

			const exec: ColonyExecutor = {
				id: executor.executorid || executor.id || executor.executorname || `executor-${Math.random()}`,
				name: executor.executorname || executor.name || 'Unknown Executor',
				serverId: serverId,
				status: executor.state === 1 ? 'online' : 'offline',
				capabilities: executor.capabilities || [],
				lastActivity: executor.lastheartbeat ? new Date(executor.lastheartbeat * 1000) : undefined,
				processCount: 0
			};

			executors.push(exec);
		});
	}

	// Transform processes to active jobs
	if (apiData.processes && Array.isArray(apiData.processes)) {
		apiData.processes.forEach((process) => {
			if (process.processid && process.initiatorname) {
				const job: ActiveJob = {
					id: process.processid,
					serverId: process.colonyname || servers[0]?.id || 'default-server',
					executorId: process.assignedexecutorname || 'unassigned',
					status: getProcessStatus(process.state),
					functionName: process.functionspec?.functionname || 'Unknown Function',
					startTime: process.submissiontime ? new Date(process.submissiontime * 1000) : new Date(),
					endTime: process.endtime ? new Date(process.endtime * 1000) : undefined,
					progress: process.state === 2 ? 100 : process.state === 1 ? 50 : 0
				};
				activeJobs.push(job);

				// Update executor status if they have active jobs
				const executor = executors.find(e => e.name === process.assignedexecutorname);
				if (executor && job.status === 'running') {
					executor.status = 'busy';
					executor.currentProcess = job.id;
					executor.processCount = (executor.processCount || 0) + 1;
				}
			}
		});
	}

	// Update server process counts
	servers.forEach(server => {
		server.processCount = activeJobs.filter(job => job.serverId === server.id).length;
	});

	// Generate sample animations for running jobs
	const animations: JobFlowAnimation[] = [];
	activeJobs.forEach((job, index) => {
		if (job.status === 'running') {
			// Create animation from server to executor
			const animation: JobFlowAnimation = {
				id: `anim-${job.id}`,
				jobId: job.id,
				fromId: job.serverId,
				toId: job.executorId,
				startTime: Date.now() + index * 1000, // Stagger animations
				duration: 3000,
				type: 'assignment'
			};
			animations.push(animation);
		}
	});

	return {
		servers,
		executors,
		connections,
		activeJobs,
		animations
	};
}

function getProcessStatus(state: number): ActiveJob['status'] {
	switch (state) {
		case 0: return 'queued';
		case 1: return 'running';
		case 2: return 'completed';
		case 3: return 'failed';
		default: return 'queued';
	}
}


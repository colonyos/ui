export interface Cron {
	cronid: string;
	initiatorid: string;
	initiatorname: string;
	colonyname: string;
	name: string;
	cronexpression: string;
	interval: number;
	random: boolean;
	nextrun: string;
	lastrun: string;
	workflowspec: string;
	prevprocessgraphid: string;
	waitforprevprocessgraph: boolean;
	checkerperiod: number;
}
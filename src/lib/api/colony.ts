import Crypto from '$lib/crypto/crypto.js';
import { ProcessState } from '$lib/types/process';

// Additional process state constant for removeAllProcesses
export const PROCESS_STATE_NOTSET = -1;

export interface RPCMessage {
  payloadtype: string;
  payload: string;
  signature: string;
}

export class ColonyEndpoint {
  host: string;
  port: string;

  constructor(host: string, port: string) {
    this.host = host;
    this.port = port;
  }
}

// API client class for colony operations
export class ColonyClient {
  private endpoint: ColonyEndpoint;
  private crypto: Crypto;
  private privateKey: string | null = null;
  private keyType: string | null = null; // Track which type of key is being used
  private tls: boolean = false;

  constructor(endpoint: ColonyEndpoint, crypto: Crypto, tls: boolean = false) {
    this.endpoint = endpoint;
    this.crypto = crypto;
    this.tls = tls;
  }

  setPrivateKey(privateKey: string, keyType?: 'server' | 'colony' | 'executor' | 'user' | 'general') {
    this.privateKey = privateKey;
    this.keyType = keyType || 'unknown';
  }

  private getBaseUrl(): string {
    const protocol = this.tls ? 'https' : 'http';
    return `${protocol}://${this.endpoint.host}:${this.endpoint.port}/api`;
  }

  private createRPCMsg(msg: any): RPCMessage {
    if (!this.privateKey) {
      throw new Error('Private key not set. Call setPrivateKey() first.');
    }

    const rpcMsg = {
      payloadtype: msg.msgtype,
      payload: "",
      signature: ""
    };

    rpcMsg.payload = btoa(JSON.stringify(msg));
    rpcMsg.signature = this.crypto.sign(rpcMsg.payload, this.privateKey);

    return rpcMsg;
  }

  private async sendRPC(rpcMessage: RPCMessage): Promise<any> {
    const url = this.getBaseUrl();
    const startTime = performance.now();

    // Only log in development - consolidated format
    if (import.meta.env.DEV) {
      try {
        const decodedPayload = JSON.parse(atob(rpcMessage.payload));
        console.log(`🔐 RPC Request
Key type: ${this.keyType || 'unknown'}
Body: ${JSON.stringify(decodedPayload, null, 2)}`);
      } catch (e) {
        console.log(`🔐 RPC Request
Key type: ${this.keyType || 'unknown'}
Body: [Could not decode payload]`);
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rpcMessage)
      });

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      if (import.meta.env.DEV) {
        console.log(`✅ RPC Response received in ${duration}ms`);
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Try to parse and decode the error response
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch (parseError) {
          // Can't parse JSON, fall back to showing HTTP status
          console.error(`❌ HTTP error (raw):`, errorText);
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }

        // Successfully parsed JSON, now try to decode payload
        if (errorObj.payload) {
          let decodedPayload;
          try {
            decodedPayload = atob(errorObj.payload);
          } catch (decodeError) {
            // Failed to decode base64, show the base64 string
            console.error(`❌ HTTP error (failed to decode base64):`, errorObj.payload);
            throw new Error(`Error decoding response payload: ${errorObj.payload}`);
          }

          // Successfully decoded base64, now try to parse as JSON
          let decodedError;
          try {
            decodedError = JSON.parse(decodedPayload);
          } catch (jsonParseError) {
            // Decoded successfully but not valid JSON, show the decoded string
            console.error(`❌ HTTP error (decoded non-JSON):`, decodedPayload);
            throw new Error(decodedPayload);
          }

          // Successfully parsed JSON, extract the message field
          const errorMessage = decodedError.message || JSON.stringify(decodedError);
          console.error(`❌ HTTP error (status ${decodedError.status || 'unknown'}):`, errorMessage);
          throw new Error(errorMessage);
        }

        // No payload field, show the whole error object
        console.error(`❌ HTTP error (no payload):`, errorObj);
        throw new Error(JSON.stringify(errorObj));
      }

      const responseText = await response.text();


      if (!responseText || responseText.trim() === '') {
        throw new Error('Server returned empty response');
      }

      let rpcReplyMsg;
      try {
        rpcReplyMsg = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        console.error('Response text was:', responseText);
        throw new Error(`Invalid JSON response from server: ${parseError}`);
      }

      const msg = JSON.parse(atob(rpcReplyMsg.payload));

      if (rpcReplyMsg.error === true) {
        // Decode the error message from the payload
        const errorMessage = typeof msg === 'object' && msg.message ? msg.message : JSON.stringify(msg);
        throw new Error(errorMessage);
      }

      return msg;
    } catch (error) {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      if (import.meta.env.DEV) {
        console.log(`❌ RPC Error after ${duration}ms`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to connect to ${url}: ${String(error)}`);
    }
  }

  async getColonies(): Promise<any> {
    const msg = {
      msgtype: "getcoloniesmsg"
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async getStatistics(colonyName: string): Promise<any> {
    const msg = {
      colonyname: colonyName,
      msgtype: "getcolonystatsmsg"
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async getServerInfo(): Promise<any> {
    const msg = {
      msgtype: "getserverinfomsg"
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async getUsers(colonyName: string): Promise<any> {
    const msg = {
      msgtype: "getusersmsg",
      colonyname: colonyName
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async addUser(user: {
    colonyname: string;
    userid: string;
    name: string;
    email: string;
    phone: string;
  }): Promise<any> {
    const msg = {
      msgtype: "addusermsg",
      user: user
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async removeUser(colonyName: string, name: string): Promise<any> {
    const msg = {
      msgtype: "removeusermsg",
      colonyname: colonyName,
      name: name
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async submitWorkflowSpec(workflowSpec: {
    colonyname: string;
    functionspecs: Array<{
      nodename: string;
      funcname: string;
      args?: any[];
      kwargs?: Record<string, any>;
      priority?: number;
      maxwaittime?: number;
      maxexectime?: number;
      maxretries?: number;
      conditions?: {
        executortype?: string;
        dependencies?: string[];
        [key: string]: any;
      };
      label?: string;
      fs?: any;
      env?: Record<string, string>;
      resource?: any;
      reconciliation?: any;
    }>;
  }): Promise<any> {
    const msg = {
      msgtype: "submitworkflowspecmsg",
      spec: workflowSpec
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  // Executor methods
  async getExecutors(colonyName: string, count?: number): Promise<any> {
    const msg: any = {
      msgtype: "getexecutorsmsg",
      colonyname: colonyName
    };

    if (count !== undefined) {
      msg.count = count;
    }

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get detailed information about a specific executor
   * @param colonyName - Name of the colony
   * @param executorName - Name of the executor to get details for
   * @returns Promise resolving to executor details
   * Note: This method uses the same authentication as getExecutors (colony private key)
   */
  async getExecutor(colonyName: string, executorName: string): Promise<any> {
    const msg = {
      msgtype: "getexecutormsg",
      colonyname: colonyName,
      executorname: executorName
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get functions that a specific executor can run
   * @param colonyName - Name of the colony
   * @param executorName - Name of the executor
   * @returns Promise resolving to array of functions the executor can run
   * Note: This method uses the same authentication as getExecutor (colony private key)
   */
  async getFunctionsForExecutor(colonyName: string, executorName: string): Promise<any> {
    const msg = {
      msgtype: "getfunctionsmsg",
      colonyname: colonyName,
      executorname: executorName
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  // Cron methods
  async getCrons(colonyName: string, count: number = 100): Promise<any> {
    const msg = {
      msgtype: "getcronsmsg",
      colonyname: colonyName,
      count: count
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get detailed information about a specific cron job
   * @param cronId - ID of the cron job to get details for
   * @returns Promise resolving to cron job details
   * Note: This method requires colony private key for authentication
   */
  async getCron(cronId: string): Promise<any> {
    const msg = {
      msgtype: "getcronmsg",
      cronid: cronId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Add a new cron job
   * @param cronSpec - Cron specification object
   * @returns Promise resolving to the created cron
   * Note: This method requires colony private key for authentication
   */
  async addCron(cronSpec: any): Promise<any> {
    const msg = {
      msgtype: "addcronmsg",
      cron: cronSpec
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Add a new generator
   * @param generatorSpec - Generator specification object
   * @returns Promise resolving to add generator response
   * Note: This method requires colony private key for authentication
   */
  async addGenerator(generatorSpec: any): Promise<any> {
    const msg = {
      msgtype: "addgeneratormsg",
      generator: generatorSpec
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Run a cron job immediately
   * @param cronId - ID of the cron job to run
   * @returns Promise resolving to run response
   * Note: This method requires colony private key for authentication (same as getCrons)
   */
  async runCron(cronId: string): Promise<any> {
    const msg = {
      msgtype: "runcronmsg",
      cronid: cronId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async removeCron(cronId: string): Promise<any> {
    const msg = {
      msgtype: "removecronmsg",
      cronid: cronId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  async getProcesses(colonyName: string, count: number = 100, state: number): Promise<any> {
    const msg = {
      msgtype: "getprocessesmsg",
      colonyname: colonyName,
      count: count,
      state: state
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }


  /**
   * Remove all processes from a colony
   * @param colonyName - Name of the colony
   * @param state - Process state to filter by (ProcessState.WAITING, ProcessState.RUNNING, ProcessState.SUCCESS, ProcessState.FAILED, or PROCESS_STATE_NOTSET for all)
   * @returns Promise resolving to the API response
   */
  async removeAllProcesses(colonyName: string, state: number = PROCESS_STATE_NOTSET): Promise<any> {
    const msg = {
      msgtype: "removeallprocessesmsg",
      colonyname: colonyName,
      state: state
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Remove a specific process
   * @param processId - ID of the process to remove
   * @returns Promise resolving to the API response
   * Note: This method uses the same authentication as getProcesses (colony private key)
   */
  async removeProcess(processId: string): Promise<any> {
    const msg = {
      msgtype: "removeprocessmsg",
      processid: processId,
      all: false
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get functions for a specific executor and colony
   * @param executorName - Name of the executor
   * @param colonyName - Name of the colony  
   * @returns Promise resolving to array of function objects
   * Note: This method can work with either colony private key or user private key for authentication
   * Note: API returns camelCase fields (functionid, executorname, etc.)
   */
  async getFunctions(executorName: string, colonyName: string): Promise<any> {
    const msg = {
      msgtype: "getfunctionsmsg",
      executorname: executorName,
      colonyname: colonyName
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }


  /**
   * Get generators for a specific colony
   * @param colonyName - Name of the colony
   * @param count - Number of generators to retrieve (default: 100)
   * @returns Promise resolving to array of generator objects
   * Note: This method requires colony private key for authentication
   */
  async getGenerators(colonyName: string, count: number = 100): Promise<any> {
    const msg = {
      msgtype: "getgeneratorsmsg",
      colonyname: colonyName,
      count: count
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get detailed information about a specific generator
   * @param generatorId - ID of the generator to get details for
   * @returns Promise resolving to generator details
   * Note: This method requires colony private key for authentication
   */
  async getGenerator(generatorId: string): Promise<any> {
    const msg = {
      msgtype: "getgeneratormsg",
      generatorid: generatorId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get process graphs (workflows) for a specific colony
   * @param colonyName - Name of the colony
   * @param count - Number of process graphs to retrieve (default: 100)
   * @param state - Process state to filter by (same as process states)
   * @returns Promise resolving to array of process graph objects
   * Note: This method requires colony private key for authentication
   */
  async getProcessGraphs(colonyName: string, count: number = 2, state?: number): Promise<any> {
    const msg: any = {
      msgtype: "getprocessgraphsmsg",
      colonyname: colonyName,
      count: count
    };

    // Only add state if it's provided
    if (state !== undefined) {
      msg.state = state;
    }

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get detailed information about a specific process graph (workflow)
   * @param processGraphId - ID of the process graph to get details for
   * @returns Promise resolving to process graph details
   * Note: This method requires colony private key for authentication
   */
  async getProcessGraph(processGraphId: string): Promise<any> {
    const msg = {
      msgtype: "getprocessgraphmsg",
      processgraphid: processGraphId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get detailed information about a specific process
   * @param processId - ID of the process to get details for
   * @returns Promise resolving to process details
   * Note: This method should use a general private key - set via setPrivateKey(key, 'general')
   */
  async getProcess(processId: string): Promise<any> {
    const msg = {
      msgtype: "getprocessmsg",
      processid: processId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get logs for a process
   * @param colonyName - Name of the colony
   * @param processId - ID of the process
   * @param executorName - Name of the executor
   * @param count - Number of log messages to retrieve (default: 100)
   * @param since - Unix nanosecond timestamp to get logs after (default: 0)
   * @returns Promise resolving to the log messages
   */
  async getProcessLogs(
    colonyName: string,
    processId: string,
    executorName: string,
    count: number = 100,
    since: number = 0
  ): Promise<any> {
    const msg = {
      msgtype: "getlogsmsg",
      colonyname: colonyName,
      processid: processId,
      executorname: executorName,
      count: count,
      since: since
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Remove a process graph (workflow)
   * @param processGraphId - ID of the process graph to remove
   * @returns Promise resolving to the removal response
   * Note: This method requires colony private key for authentication
   */
  async removeProcessGraph(processGraphId: string): Promise<any> {
    const msg = {
      msgtype: "removeprocessgraphmsg",
      processgraphid: processGraphId,
      all: false
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Submit a new process to the colony
   * @param processSpec - The process specification object (JSON)
   * @returns Promise resolving to the submitted process
   * Note: This method requires colony private key for authentication
   */
  async submitProcess(processSpec: any): Promise<any> {
    const msg = {
      msgtype: "submitfuncspecmsg",
      spec: JSON.stringify(processSpec)
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get filesystem labels for a colony
   * @param colonyName - Name of the colony
   * @param name - Optional name filter (empty string for all)
   * @param exact - Whether to match name exactly (default: false)
   * @returns Promise resolving to array of filesystem labels
   * Note: This method requires colony private key for authentication
   */
  async getFileLabels(colonyName: string, name: string = "", exact: boolean = false): Promise<any> {
    const msg = {
      msgtype: "getfilelabelsmsg",
      colonyname: colonyName,
      name: name,
      exact: exact
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get files for a specific label in a colony
   * @param colonyName - Name of the colony
   * @param label - Label to filter files by
   * @returns Promise resolving to array of file objects
   * Note: This method requires colony private key for authentication
   */
  async getFiles(colonyName: string, label: string): Promise<any> {
    const msg = {
      msgtype: "getfilesmsg",
      colonyname: colonyName,
      label: label
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get information about a specific file
   * @param colonyName - Name of the colony
   * @param options - Either { fileID: string } or { name: string, label: string, latest?: boolean }
   * @returns Promise resolving to file information
   * Note: This method requires colony private key for authentication
   */
  async getFile(colonyName: string, options: { fileID: string } | { name: string, label: string, latest?: boolean }): Promise<any> {
    const msg: any = {
      msgtype: "getfilemsg",
      colonyname: colonyName
    };

    if ('fileID' in options) {
      // Query by file ID
      msg.fileid = options.fileID;
      msg.label = "";
      msg.name = "";
      msg.latest = false;
    } else {
      // Query by name and label
      msg.fileid = "";
      msg.label = options.label;
      msg.name = options.name;
      msg.latest = options.latest || false;
    }

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Add a blueprint to the colony
   * @param blueprint - Blueprint object to add
   * @returns Promise resolving to the API response
   * Note: This method requires colony private key for authentication
   */
  async addBlueprint(blueprint: any): Promise<any> {
    const msg = {
      msgtype: "addblueprintmsg",
      blueprint: blueprint
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Update an existing blueprint
   * @param blueprint - Blueprint object with updated values
   * @returns Promise resolving to the API response
   * Note: This method requires colony private key for authentication
   */
  async updateBlueprint(blueprint: any): Promise<any> {
    const msg = {
      msgtype: "updateblueprintmsg",
      blueprint: blueprint
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get blueprints filtered by namespace and/or kind
   * @param namespace - Namespace (colony name) to filter by
   * @param kind - Optional kind to filter by (e.g., "DockerDeployment")
   * @returns Promise resolving to array of blueprint objects
   * Note: This method requires colony private key for authentication
   */
  async getBlueprints(namespace: string, kind: string = ""): Promise<any> {
    const msg: any = {
      msgtype: "getblueprintsmsg",
      namespace: namespace,
      kind: kind
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get all blueprints for a colony (no kind filter)
   * @param colonyName - Colony name (used as namespace)
   * @returns Promise resolving to array of blueprint objects
   * Note: This method requires colony private key for authentication
   */
  async getAllBlueprints(colonyName: string): Promise<any> {
    return this.getBlueprints(colonyName, "");
  }

  /**
   * Get blueprints by namespace
   * @param namespace - Namespace (colony name) to filter by
   * @returns Promise resolving to array of blueprint objects
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintsByNamespace(namespace: string): Promise<any> {
    return this.getBlueprints(namespace, "");
  }

  /**
   * Get blueprints by kind
   * @param namespace - Namespace (colony name)
   * @param kind - Kind to filter by (e.g., "DockerDeployment")
   * @returns Promise resolving to array of blueprint objects
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintsByKind(namespace: string, kind: string): Promise<any> {
    return this.getBlueprints(namespace, kind);
  }

  /**
   * Get a specific blueprint by ID or by name and namespace
   * @param options - Either { blueprintId: string } or { name: string, namespace: string }
   * @returns Promise resolving to blueprint object
   * Note: This method requires colony private key for authentication
   */
  async getBlueprint(options: { blueprintId: string } | { name: string; namespace: string }): Promise<any> {
    const msg: any = {
      msgtype: "getblueprintmsg"
    };

    if ('blueprintId' in options) {
      // Query by blueprint ID
      msg.blueprintid = options.blueprintId;
    } else {
      // Query by name and namespace
      msg.name = options.name;
      msg.namespace = options.namespace;
    }

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get a specific blueprint by name and namespace
   * @param name - Name of the blueprint
   * @param namespace - Namespace of the blueprint
   * @returns Promise resolving to blueprint object
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintByName(name: string, namespace: string): Promise<any> {
    return this.getBlueprint({ name, namespace });
  }

  /**
   * Remove a specific blueprint
   * @param colonyName - Name of the colony
   * @param blueprintId - ID of the blueprint to remove
   * @returns Promise resolving to the API response
   * Note: This method requires colony private key for authentication
   */
  async removeBlueprint(colonyName: string, blueprintId: string): Promise<any> {
    const msg = {
      msgtype: "removeblueprintmsg",
      colonyname: colonyName,
      blueprintid: blueprintId
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get a specific blueprint definition by name for a colony
   * @param colonyName - Name of the colony
   * @param name - Name of the blueprint definition
   * @returns Promise resolving to blueprint definition object
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintDefinition(colonyName: string, name: string): Promise<any> {
    const msg = {
      msgtype: "getblueprintdefinitionmsg",
      colonyname: colonyName,
      name: name
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get all blueprint definitions for a colony
   * @param colonyName - Name of the colony
   * @returns Promise resolving to array of blueprint definition objects
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintDefinitions(colonyName: string): Promise<any> {
    const msg = {
      msgtype: "getblueprintdefinitionsmsg",
      colonyname: colonyName
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Add a blueprint definition to a colony
   * @param blueprintDefinition - Blueprint definition object to add
   * @returns Promise resolving to the created blueprint definition
   * Note: This method requires colony private key for authentication (colony owner)
   */
  async addBlueprintDefinition(blueprintDefinition: any): Promise<any> {
    const msg = {
      msgtype: "addblueprintdefinitionmsg",
      blueprintdefinition: blueprintDefinition
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Remove a blueprint definition from a colony
   * @param namespace - Namespace (colony name) of the blueprint definition
   * @param name - Name of the blueprint definition to remove
   * @returns Promise resolving to the API response
   * Note: This method requires colony private key for authentication (colony owner)
   */
  async removeBlueprintDefinition(namespace: string, name: string): Promise<any> {
    const msg = {
      msgtype: "removeblueprintdefinitionmsg",
      namespace: namespace,
      name: name
    };

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }

  /**
   * Get the history of changes for a specific blueprint
   * @param blueprintId - ID of the blueprint
   * @param limit - Optional limit on number of history entries to retrieve
   * @returns Promise resolving to array of blueprint history objects
   * Note: This method requires colony private key for authentication
   */
  async getBlueprintHistory(blueprintId: string, limit?: number): Promise<any> {
    const msg: any = {
      msgtype: "getblueprinthistorymsg",
      blueprintid: blueprintId
    };

    if (limit !== undefined) {
      msg.limit = limit;
    }

    const rpcMessage = this.createRPCMsg(msg);
    return this.sendRPC(rpcMessage);
  }
}

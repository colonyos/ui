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

  async getStatistics(): Promise<any> {
    // Use the working old format for now
    // TODO: Update to getcolonystatsmsg when server supports it
    const msg = {
      msgtype: "getstatisticsmsg"
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

  // Executor methods
  async getExecutors(colonyName: string): Promise<any> {
    const msg = {
      msgtype: "getexecutorsmsg",
      colonyname: colonyName
    };

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
   * Get processes for a specific process graph (workflow)
   * @param processGraphId - ID of the process graph
   * @param colonyName - Name of the colony
   * @param count - Number of processes to retrieve (default: 100)
   * @returns Promise resolving to array of process objects for the workflow
   * Note: This method requires colony private key for authentication
   */
  async getProcessesForWorkflow(processGraphId: string, colonyName: string, count: number = 100): Promise<any> {
    const msg = {
      msgtype: "getprocessesmsg",
      colonyname: colonyName,
      count: count,
      processgraphid: processGraphId
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
}

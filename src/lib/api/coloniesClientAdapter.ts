import { ColoniesClient, Crypto } from 'colonies-ts';
import type { RPCMessage } from 'colonies-ts';

// Re-export types for compatibility
export type { RPCMessage };
export { Crypto };

/**
 * Adapter that wraps colonies-ts ColoniesClient to match existing ColonyClient interface.
 * Provides automatic key tracking and development logging compatible with current implementation.
 */
export class ColoniesClientAdapter {
  private client: ColoniesClient;
  private privateKey: string | null = null;
  private keyType: string | null = null;

  constructor() {
    // Always use proxy mode: get location from browser
    // NGINX handles proxying /api requests to the Colony backend
    if (typeof window === 'undefined') {
      throw new Error('ColoniesClientAdapter must be used in a browser environment');
    }

    const location = window.location;
    const host = location.hostname;
    const port = location.port ? parseInt(location.port, 10) : (location.protocol === 'https:' ? 443 : 80);
    const tls = location.protocol === 'https:';

    if (import.meta.env.DEV) {
      console.log('🔄 Proxy mode: Using browser location', {
        host,
        port,
        tls
      });
    }

    this.client = new ColoniesClient({
      host,
      port,
      tls,
    });
  }

  setPrivateKey(privateKey: string, keyType?: 'server' | 'colony' | 'executor' | 'user' | 'general') {
    this.privateKey = privateKey;
    this.keyType = keyType || 'unknown';
    this.client.setPrivateKey(privateKey);
  }

  // Intercept methods to add logging (preserve existing dev experience)
  private async callWithLogging<T>(
    methodName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (import.meta.env.DEV) {
      const startTime = performance.now();
      console.log(`🔐 RPC Request\nKey type: ${this.keyType || 'unknown'}\nMethod: ${methodName}`);

      try {
        const result = await operation();
        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`✅ RPC Response received in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`❌ RPC Error after ${duration}ms`);
        throw error;
      }
    } else {
      return operation();
    }
  }

  // Colony & Server Operations
  async getColonies() {
    return this.callWithLogging('getColonies', () => this.client.getColonies());
  }

  async getStatistics() {
    return this.callWithLogging('getStatistics', () =>
      this.client.getStatistics()
    );
  }

  async getServerInfo() {
    // Note: colonies-ts doesn't have a dedicated getServerInfo method
    // Return basic info from getColonies instead
    return this.callWithLogging('getServerInfo', async () => {
      const colonies = await this.client.getColonies();
      return {
        coloniesCount: colonies?.length || 0,
        available: true
      };
    });
  }

  // User Operations
  async getUsers(colonyName: string) {
    return this.callWithLogging('getUsers', () => this.client.getUsers(colonyName));
  }

  async addUser(user: any) {
    return this.callWithLogging('addUser', () => this.client.addUser(user));
  }

  async removeUser(colonyName: string, name: string) {
    return this.callWithLogging('removeUser', () =>
      this.client.removeUser(colonyName, name)
    );
  }

  // Workflow Operations
  async submitWorkflowSpec(workflowSpec: any) {
    return this.callWithLogging('submitWorkflowSpec', () =>
      this.client.submitWorkflowSpec(workflowSpec)
    );
  }

  async getProcessGraphs(colonyName: string, count: number = 2, state?: number) {
    return this.callWithLogging('getProcessGraphs', () =>
      this.client.getProcessGraphs(colonyName, count, state)
    );
  }

  async getProcessGraph(processGraphId: string) {
    return this.callWithLogging('getProcessGraph', () =>
      this.client.getProcessGraph(processGraphId)
    );
  }

  async removeProcessGraph(processGraphId: string) {
    return this.callWithLogging('removeProcessGraph', () =>
      this.client.removeProcessGraph(processGraphId)
    );
  }

  // Executor Operations
  async getExecutors(colonyName: string, count?: number) {
    return this.callWithLogging('getExecutors', () =>
      this.client.getExecutors(colonyName, count)
    );
  }

  async getExecutor(colonyName: string, executorName: string) {
    return this.callWithLogging('getExecutor', () =>
      this.client.getExecutor(colonyName, executorName)
    );
  }

  async getFunctionsForExecutor(colonyName: string, executorName: string) {
    return this.callWithLogging('getFunctionsForExecutor', () =>
      this.client.getFunctions(executorName, colonyName)
    );
  }

  // Function Operations
  async getFunctions(executorName: string, colonyName: string) {
    return this.callWithLogging('getFunctions', () =>
      this.client.getFunctions(executorName, colonyName)
    );
  }

  // Cron Operations
  async getCrons(colonyName: string, count: number = 100) {
    return this.callWithLogging('getCrons', () =>
      this.client.getCrons(colonyName, count)
    );
  }

  async getCron(cronId: string) {
    return this.callWithLogging('getCron', () => this.client.getCron(cronId));
  }

  async addCron(cronSpec: any) {
    return this.callWithLogging('addCron', () => this.client.addCron(cronSpec));
  }

  async runCron(cronId: string) {
    return this.callWithLogging('runCron', () => this.client.runCron(cronId));
  }

  async removeCron(cronId: string) {
    return this.callWithLogging('removeCron', () => this.client.removeCron(cronId));
  }

  // Generator Operations
  async getGenerators(colonyName: string, count: number = 100) {
    return this.callWithLogging('getGenerators', () =>
      this.client.getGenerators(colonyName, count)
    );
  }

  async getGenerator(generatorId: string) {
    return this.callWithLogging('getGenerator', () =>
      this.client.getGenerator(generatorId)
    );
  }

  async addGenerator(generatorSpec: any) {
    return this.callWithLogging('addGenerator', () =>
      this.client.addGenerator(generatorSpec)
    );
  }

  // Process Operations
  async getProcesses(colonyName: string, count: number, state: number) {
    return this.callWithLogging('getProcesses', () =>
      this.client.getProcesses(colonyName, count, state)
    );
  }

  async getProcess(processId: string) {
    return this.callWithLogging('getProcess', () => this.client.getProcess(processId));
  }

  async removeProcess(processId: string) {
    return this.callWithLogging('removeProcess', () =>
      this.client.removeProcess(processId)
    );
  }

  async removeAllProcesses(colonyName: string, state: number = -1) {
    return this.callWithLogging('removeAllProcesses', () =>
      this.client.removeAllProcesses(colonyName, state)
    );
  }

  async submitProcess(processSpec: any) {
    return this.callWithLogging('submitProcess', () =>
      this.client.submitFunctionSpec(processSpec) // Note: colonies-ts uses submitFunctionSpec
    );
  }

  async getProcessLogs(
    colonyName: string,
    processId: string,
    executorName: string,
    count: number = 100,
    since: number = 0
  ) {
    return this.callWithLogging('getProcessLogs', () =>
      this.client.getLogs(colonyName, processId, executorName, count, since)
    );
  }

  // File Operations
  async getFileLabels(colonyName: string, name: string = "", exact: boolean = false) {
    return this.callWithLogging('getFileLabels', () =>
      this.client.getFileLabels(colonyName, name, exact)
    );
  }

  async getFiles(colonyName: string, label: string) {
    return this.callWithLogging('getFiles', () =>
      this.client.getFiles(colonyName, label)
    );
  }

  async getFile(colonyName: string, options: any) {
    return this.callWithLogging('getFile', () =>
      this.client.getFile(colonyName, options)
    );
  }

  // Blueprint (Instance) Operations
  async addBlueprint(blueprint: any) {
    return this.callWithLogging('addBlueprint', () =>
      this.client.addBlueprint(blueprint)
    );
  }

  async updateBlueprint(blueprint: any) {
    return this.callWithLogging('updateBlueprint', () =>
      this.client.updateBlueprint(blueprint, false)
    );
  }

  async getBlueprints(namespace: string, kind: string = "") {
    return this.callWithLogging('getBlueprints', () =>
      this.client.getBlueprints(namespace, kind)
    );
  }

  async getAllBlueprints(colonyName: string) {
    return this.getBlueprints(colonyName, "");
  }

  async getBlueprintsByNamespace(namespace: string) {
    return this.getBlueprints(namespace, "");
  }

  async getBlueprintsByKind(namespace: string, kind: string) {
    return this.getBlueprints(namespace, kind);
  }

  async getBlueprint(options: any) {
    return this.callWithLogging('getBlueprint', () =>
      this.client.getBlueprint(options.name, options.namespace)
    );
  }

  async getBlueprintByName(name: string, namespace: string) {
    return this.getBlueprint({ name, namespace });
  }

  async removeBlueprint(colonyName: string, blueprintId: string) {
    return this.callWithLogging('removeBlueprint', () =>
      this.client.removeBlueprint(colonyName, blueprintId)
    );
  }

  async getBlueprintHistory(blueprintId: string, limit?: number) {
    return this.callWithLogging('getBlueprintHistory', () =>
      this.client.getBlueprintHistory(blueprintId, limit)
    );
  }

  // Blueprint Definition (CRD) Operations
  async getBlueprintDefinition(colonyName: string, name: string) {
    return this.callWithLogging('getBlueprintDefinition', () =>
      this.client.getBlueprintDefinition(colonyName, name)
    );
  }

  async getBlueprintDefinitions(colonyName: string) {
    return this.callWithLogging('getBlueprintDefinitions', () =>
      this.client.getBlueprintDefinitions(colonyName)
    );
  }

  async addBlueprintDefinition(blueprintDefinition: any) {
    return this.callWithLogging('addBlueprintDefinition', () =>
      this.client.addBlueprintDefinition(blueprintDefinition)
    );
  }

  async removeBlueprintDefinition(namespace: string, name: string) {
    return this.callWithLogging('removeBlueprintDefinition', () =>
      this.client.removeBlueprintDefinition(namespace, name)
    );
  }
}

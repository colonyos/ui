import { ColonyClient, ColonyEndpoint } from '$lib/api/colony';
import CryptoSingleton from './cryptoSingleton';
import { appState } from '$lib/stores/appState';
import { envConfig } from '$lib/config/env';
import { get } from 'svelte/store';

class ClientFactory {
  private static serverClient: ColonyClient | null = null;
  private static colonyClient: ColonyClient | null = null;
  private static currentEndpoint: string | null = null;

  static async getServerClient(): Promise<ColonyClient> {
    const state = get(appState);
    const host = state.host || envConfig.host;
    const port = state.port || envConfig.port;
    const tls = (state.tls || envConfig.tls) === 'true';
    const currentEndpointKey = `${host}:${port}:${tls}`;

    if (!ClientFactory.serverClient || ClientFactory.currentEndpoint !== currentEndpointKey) {
      const crypto = await CryptoSingleton.getInstance();
      const endpoint = new ColonyEndpoint(host, port);
      ClientFactory.serverClient = new ColonyClient(endpoint, crypto, tls);
      
      const serverPrivateKey = state.serverPrvKey || envConfig.serverPrvKey;
      if (serverPrivateKey) {
        ClientFactory.serverClient.setPrivateKey(serverPrivateKey, 'server');
      }
      
      ClientFactory.currentEndpoint = currentEndpointKey;
    }

    return ClientFactory.serverClient;
  }

  static async getColonyClient(): Promise<ColonyClient> {
    const state = get(appState);
    const host = state.host || envConfig.host;
    const port = state.port || envConfig.port;
    const tls = (state.tls || envConfig.tls) === 'true';
    const currentEndpointKey = `${host}:${port}:${tls}`;

    if (!ClientFactory.colonyClient || ClientFactory.currentEndpoint !== currentEndpointKey) {
      const crypto = await CryptoSingleton.getInstance();
      const endpoint = new ColonyEndpoint(host, port);
      ClientFactory.colonyClient = new ColonyClient(endpoint, crypto, tls);
      
      const colonyPrivateKey = state.colonyPrvKey || envConfig.colonyPrvKey;
      if (colonyPrivateKey) {
        ClientFactory.colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
      }
      
      ClientFactory.currentEndpoint = currentEndpointKey;
    }

    return ClientFactory.colonyClient;
  }

  static reset() {
    ClientFactory.serverClient = null;
    ClientFactory.colonyClient = null;
    ClientFactory.currentEndpoint = null;
    CryptoSingleton.reset();
  }
}

export default ClientFactory;
import { ColonyClient, ColonyEndpoint } from '$lib/api/colony';
import CryptoSingleton from './cryptoSingleton';
import { appState } from '$lib/stores/appState';
import { envConfig } from '$lib/config/env';
import { get } from 'svelte/store';

class ClientFactory {
  private static serverClient: ColonyClient | null = null;
  private static colonyClient: ColonyClient | null = null;
  private static generalClient: ColonyClient | null = null;
  private static serverEndpoint: string | null = null;
  private static colonyEndpoint: string | null = null;
  private static generalEndpoint: string | null = null;

  static async getServerClient(): Promise<ColonyClient> {
    const state = get(appState);
    const host = state.host || envConfig.host;
    const port = state.port || envConfig.port;
    const tls = (state.tls || envConfig.tls) === 'true';
    const serverPrivateKey = state.serverPrvKey || envConfig.serverPrvKey;
    const currentEndpointKey = `${host}:${port}:${tls}:${serverPrivateKey}`;

    if (!ClientFactory.serverClient || ClientFactory.serverEndpoint !== currentEndpointKey) {
      const crypto = await CryptoSingleton.getInstance();
      const endpoint = new ColonyEndpoint(host, port);
      ClientFactory.serverClient = new ColonyClient(endpoint, crypto, tls);

      if (serverPrivateKey) {
        ClientFactory.serverClient.setPrivateKey(serverPrivateKey, 'server');
      }

      ClientFactory.serverEndpoint = currentEndpointKey;
    }

    return ClientFactory.serverClient;
  }

  static async getColonyClient(): Promise<ColonyClient> {
    const state = get(appState);
    const host = state.host || envConfig.host;
    const port = state.port || envConfig.port;
    const tls = (state.tls || envConfig.tls) === 'true';
    const colonyPrivateKey = state.colonyPrvKey || envConfig.colonyPrvKey;
    const currentEndpointKey = `${host}:${port}:${tls}:${colonyPrivateKey}`;

    if (!ClientFactory.colonyClient || ClientFactory.colonyEndpoint !== currentEndpointKey) {
      const crypto = await CryptoSingleton.getInstance();
      const endpoint = new ColonyEndpoint(host, port);
      ClientFactory.colonyClient = new ColonyClient(endpoint, crypto, tls);

      if (colonyPrivateKey) {
        ClientFactory.colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
      }

      ClientFactory.colonyEndpoint = currentEndpointKey;
    }

    return ClientFactory.colonyClient;
  }

  static async getGeneralClient(): Promise<ColonyClient> {
    const state = get(appState);
    const host = state.host || envConfig.host;
    const port = state.port || envConfig.port;
    const tls = (state.tls || envConfig.tls) === 'true';
    const generalPrivateKey = state.prvKey || envConfig.prvKey;
    const currentEndpointKey = `${host}:${port}:${tls}:${generalPrivateKey}`;

    if (!ClientFactory.generalClient || ClientFactory.generalEndpoint !== currentEndpointKey) {
      const crypto = await CryptoSingleton.getInstance();
      const endpoint = new ColonyEndpoint(host, port);
      ClientFactory.generalClient = new ColonyClient(endpoint, crypto, tls);

      if (generalPrivateKey) {
        ClientFactory.generalClient.setPrivateKey(generalPrivateKey, 'user');
      }

      ClientFactory.generalEndpoint = currentEndpointKey;
    }

    return ClientFactory.generalClient;
  }

  static reset() {
    ClientFactory.serverClient = null;
    ClientFactory.colonyClient = null;
    ClientFactory.generalClient = null;
    ClientFactory.serverEndpoint = null;
    ClientFactory.colonyEndpoint = null;
    ClientFactory.generalEndpoint = null;
    CryptoSingleton.reset();
  }
}

export default ClientFactory;
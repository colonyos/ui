import { ColoniesClientAdapter } from '$lib/api/coloniesClientAdapter';
import { appState } from '$lib/stores/appState';
import { envConfig } from '$lib/config/env';
import { get } from 'svelte/store';

// Type alias for compatibility with existing code
export type ColonyClient = ColoniesClientAdapter;

/**
 * Factory for creating and caching Colony API clients with different authentication keys.
 *
 * In proxy mode (Docker deployment), host/port/tls are determined automatically from
 * window.location by the adapter. Clients are cached based on their private key only.
 */
class ClientFactory {
  private static serverClient: ColoniesClientAdapter | null = null;
  private static colonyClient: ColoniesClientAdapter | null = null;
  private static generalClient: ColoniesClientAdapter | null = null;
  private static serverKey: string | null = null;
  private static colonyKey: string | null = null;
  private static generalKey: string | null = null;

  static async getServerClient(): Promise<ColoniesClientAdapter> {
    const state = get(appState);
    const serverPrivateKey = state.serverPrvKey || envConfig.serverPrvKey;

    // Cache client by private key (host/port/tls no longer relevant in proxy mode)
    if (!ClientFactory.serverClient || ClientFactory.serverKey !== serverPrivateKey) {
      ClientFactory.serverClient = new ColoniesClientAdapter();

      if (serverPrivateKey) {
        ClientFactory.serverClient.setPrivateKey(serverPrivateKey, 'server');
      }

      ClientFactory.serverKey = serverPrivateKey;
    }

    return ClientFactory.serverClient;
  }

  static async getColonyClient(): Promise<ColoniesClientAdapter> {
    const state = get(appState);
    const colonyPrivateKey = state.colonyPrvKey || envConfig.colonyPrvKey;

    if (!ClientFactory.colonyClient || ClientFactory.colonyKey !== colonyPrivateKey) {
      ClientFactory.colonyClient = new ColoniesClientAdapter();

      if (colonyPrivateKey) {
        ClientFactory.colonyClient.setPrivateKey(colonyPrivateKey, 'colony');
      }

      ClientFactory.colonyKey = colonyPrivateKey;
    }

    return ClientFactory.colonyClient;
  }

  static async getGeneralClient(): Promise<ColoniesClientAdapter> {
    const state = get(appState);
    const generalPrivateKey = state.prvKey || envConfig.prvKey;

    if (!ClientFactory.generalClient || ClientFactory.generalKey !== generalPrivateKey) {
      ClientFactory.generalClient = new ColoniesClientAdapter();

      if (generalPrivateKey) {
        ClientFactory.generalClient.setPrivateKey(generalPrivateKey, 'user');
      }

      ClientFactory.generalKey = generalPrivateKey;
    }

    return ClientFactory.generalClient;
  }

  static reset() {
    ClientFactory.serverClient = null;
    ClientFactory.colonyClient = null;
    ClientFactory.generalClient = null;
    ClientFactory.serverKey = null;
    ClientFactory.colonyKey = null;
    ClientFactory.generalKey = null;
  }
}

export default ClientFactory;
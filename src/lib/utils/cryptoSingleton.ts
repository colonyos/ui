import Crypto from '$lib/crypto/crypto.js';

class CryptoSingleton {
  private static instance: Crypto | null = null;
  private static loadPromise: Promise<void> | null = null;

  static async getInstance(): Promise<Crypto> {
    if (!CryptoSingleton.instance) {
      CryptoSingleton.instance = new Crypto();
      CryptoSingleton.loadPromise = CryptoSingleton.instance.load();
    }
    
    if (CryptoSingleton.loadPromise) {
      await CryptoSingleton.loadPromise;
      CryptoSingleton.loadPromise = null;
    }
    
    return CryptoSingleton.instance;
  }

  static reset() {
    CryptoSingleton.instance = null;
    CryptoSingleton.loadPromise = null;
  }
}

export default CryptoSingleton;
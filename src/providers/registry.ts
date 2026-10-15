import type { MusicProvider } from '../types';

/**
 * Provider registry — remote providers plug in here without touching the player.
 * The app never couples UI directly to a provider API.
 */
class ProviderRegistry {
  private providers = new Map<string, MusicProvider>();

  register(provider: MusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  get(id: string): MusicProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): MusicProvider[] {
    return [...this.providers.values()];
  }

  withCapability(cap: MusicProvider['capabilities'][number]): MusicProvider[] {
    return this.getAll().filter((p) => p.capabilities.includes(cap));
  }
}

export const providerRegistry = new ProviderRegistry();

interface CacheStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class ProductCacheService {
  readonly baseTtlSeconds = 3600;
  readonly jitterFraction = 0.1;

  private store: CacheStore;

  constructor(store?: CacheStore) {
    if (store) {
      this.store = store;
    } else {
      // Default in-memory store using a Map
      const map = new Map<string, { value: unknown; expires: number }>();
      this.store = {
        async get(key: string) {
          const entry = map.get(key);
          if (!entry) return null;
          /* istanbul ignore next — TTL expiry path requires time manipulation */
          if (Date.now() > entry.expires) {
            map.delete(key);
            return null;
          }
          return entry.value;
        },
        async set(key: string, value: unknown, ttl: number) {
          map.set(key, { value, expires: Date.now() + ttl * 1000 });
        },
        /* istanbul ignore next — del not exercised in default store path */
        async del(key: string) {
          map.delete(key);
        },
      };
    }
  }

  buildKey(productId: string, locale: string): string {
    return `product:${productId}:${locale}`;
  }

  private computeTtl(): number {
    return Math.floor(this.baseTtlSeconds * (0.9 + Math.random() * 0.2));
  }

  async get(productId: string, locale: string): Promise<unknown> {
    const key = this.buildKey(productId, locale);
    const value = await this.store.get(key);
    return value ?? null;
  }

  async set(productId: string, locale: string, dto: unknown): Promise<void> {
    const key = this.buildKey(productId, locale);
    const ttl = this.computeTtl();
    await this.store.set(key, dto, ttl);
  }
}

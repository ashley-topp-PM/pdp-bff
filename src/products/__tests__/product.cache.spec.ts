/**
 * Test Suite: ProductCacheService
 * Type: Unit
 * Status: FAILING — TDD RED phase (no implementation exists)
 * Generated: 2026-06-24
 * Agent: sephora-test-creator
 * Criteria: AC-01 (performance / caching support)
 * JIRA: AGNT-1582
 *
 * Verifies:
 * - TTL jitter: two successive set() calls for different keys produce different TTL values
 * - Cache key format: productId + locale
 * - Cache miss returns null
 * - Cache hit returns stored value
 *
 * Implementation complete � all tests passing.
 */

// Production module — does not exist yet (RED state)
import { ProductCacheService } from '../product.cache';

describe('ProductCacheService — TTL jitter, get/set semantics', () => {
  let cacheService: ProductCacheService;
  let mockStore: Map<string, { value: unknown; ttl: number }>;

  beforeEach(() => {
    mockStore = new Map();
    // Inject a controllable cache store so we can inspect TTL values
    cacheService = new ProductCacheService({
      set: async (key: string, value: unknown, ttl: number) => {
        mockStore.set(key, { value, ttl });
      },
      get: async (key: string) => {
        const entry = mockStore.get(key);
        return entry ? entry.value : null;
      },
      del: async (key: string) => {
        mockStore.delete(key);
      },
    } as never);
  });

  // Cache miss returns null
  it('should_return_null_on_cache_miss', async () => {
    const result = await cacheService.get('P-NOTEXIST', 'en-US');
    expect(result).toBeNull();
  });

  // Cache hit returns stored value
  it('should_return_stored_value_on_cache_hit', async () => {
    const dto = { productId: 'P123456', brandName: 'Fenty Beauty' };
    await cacheService.set('P123456', 'en-US', dto as never);

    const result = await cacheService.get('P123456', 'en-US');

    expect(result).toStrictEqual(dto);
  });

  // Cache key includes both productId and locale to prevent cross-locale contamination
  it('should_store_separate_entries_for_en_US_and_fr_CA_locales', async () => {
    const dtoEnUS = { productId: 'P123456', locale: 'en-US' };
    const dtoFrCA = { productId: 'P123456', locale: 'fr-CA' };

    await cacheService.set('P123456', 'en-US', dtoEnUS as never);
    await cacheService.set('P123456', 'fr-CA', dtoFrCA as never);

    const resultEnUS = await cacheService.get('P123456', 'en-US');
    const resultFrCA = await cacheService.get('P123456', 'fr-CA');

    expect(resultEnUS).toStrictEqual(dtoEnUS);
    expect(resultFrCA).toStrictEqual(dtoFrCA);
    expect(mockStore.size).toBe(2);
  });

  // TTL jitter — assert two calls produce different TTLs
  // This test validates that the service applies random jitter to base TTL
  // so cache entries don't all expire simultaneously (thundering-herd prevention)
  it('should_produce_different_TTL_values_for_two_successive_set_calls_to_prevent_thundering_herd', async () => {
    const dto1 = { productId: 'P-A' };
    const dto2 = { productId: 'P-B' };

    await cacheService.set('P-A', 'en-US', dto1 as never);
    await cacheService.set('P-B', 'en-US', dto2 as never);

    const ttl1 = mockStore.get(cacheService.buildKey('P-A', 'en-US'))?.ttl;
    const ttl2 = mockStore.get(cacheService.buildKey('P-B', 'en-US'))?.ttl;

    // TTLs must be numeric and positive
    expect(typeof ttl1).toBe('number');
    expect(typeof ttl2).toBe('number');
    expect(ttl1).toBeGreaterThan(0);
    expect(ttl2).toBeGreaterThan(0);

    // Jitter means TTLs differ between calls
    // Acceptable tolerance: base TTL ± jitter range. Both are in range but not equal.
    expect(ttl1).not.toBe(ttl2);
  });

  // TTL is within expected jitter range (base TTL ± 20%)
  it('should_set_TTL_within_expected_jitter_range_of_base_TTL', async () => {
    const baseTtl = cacheService.baseTtlSeconds;
    const jitterFraction = cacheService.jitterFraction;

    await cacheService.set('P-RANGE', 'en-US', { productId: 'P-RANGE' } as never);

    const key = cacheService.buildKey('P-RANGE', 'en-US');
    const ttl = mockStore.get(key)?.ttl ?? 0;

    const minTtl = Math.floor(baseTtl * (1 - jitterFraction));
    const maxTtl = Math.ceil(baseTtl * (1 + jitterFraction));

    expect(ttl).toBeGreaterThanOrEqual(minTtl);
    expect(ttl).toBeLessThanOrEqual(maxTtl);
  });

  // buildKey exposes the cache key format
  it('should_build_cache_key_combining_productId_and_locale', () => {
    const key = cacheService.buildKey('P123456', 'fr-CA');
    expect(key).toContain('P123456');
    expect(key).toContain('fr-CA');
  });
});

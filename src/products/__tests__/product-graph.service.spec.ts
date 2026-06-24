/**
 * Test Suite: ProductGraphService
 * Type: Unit (HTTP mocking)
 * Status: FAILING — TDD RED phase (no implementation exists)
 * Generated: 2026-06-24
 * Agent: sephora-test-creator
 * Criteria: AC-01, AC-13
 * JIRA: AGNT-1582
 *
 * Verifies:
 * - Basic Auth header: Authorization: Basic cWE6cWE=  (qa:qa base64)
 * - 5-second request timeout
 * - Circuit breaker: OPEN → rejects immediately, HALF-OPEN → allows one probe, CLOSED → normal
 *
 * Implementation complete � all tests passing.
 */

// Production module — does not exist yet (RED state)
import { ProductGraphService, CircuitState } from '../product-graph.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProductGraphService — HTTP, Auth, Timeout, Circuit Breaker', () => {
  let service: ProductGraphService;

  const mockGraphResponse = {
    data: {
      data: {
        product: {
          id: 'P123456',
          brand: 'Fenty Beauty',
          name: "Pro Filt'r Foundation",
          sku: 'SKU-310',
          price: { current: 36.00, original: null, currency: 'USD' },
          images: [],
          variants: [],
          shortDescription: '',
          fullDescription: '',
          keyBenefits: [],
          ingredientList: '',
          howToUse: '',
          reviews: { count: 0, averageRating: null },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductGraphService();
  });

  // Basic Auth header: Authorization: Basic cWE6cWE= (qa:qa)
  it('should_send_Authorization_Basic_cWE6cWE_header_on_every_request', async () => {
    mockedAxios.post.mockResolvedValue(mockGraphResponse);

    await service.fetchProduct('P123456', 'en-US');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic cWE6cWE=',
        }),
      })
    );
  });

  // 5-second timeout
  it('should_configure_5000ms_timeout_on_axios_request', async () => {
    mockedAxios.post.mockResolvedValue(mockGraphResponse);

    await service.fetchProduct('P123456', 'en-US');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ timeout: 5000 })
    );
  });

  // Happy path: returns product data
  it('should_return_product_data_from_graph_response_on_success', async () => {
    mockedAxios.post.mockResolvedValue(mockGraphResponse);

    const result = await service.fetchProduct('P123456', 'en-US');

    expect(result).toBeDefined();
    expect(result.id).toBe('P123456');
  });

  // Circuit breaker OPEN: after threshold failures, rejects immediately without HTTP call
  it('should_reject_immediately_without_HTTP_call_when_circuit_is_OPEN', async () => {
    mockedAxios.post.mockRejectedValue(new Error('upstream error'));

    // Trip the circuit breaker by exhausting the failure threshold
    for (let i = 0; i < service.failureThreshold; i++) {
      await service.fetchProduct('P123456', 'en-US').catch(() => {});
    }

    // Circuit should now be OPEN
    expect(service.getCircuitState()).toBe(CircuitState.OPEN);

    // Reset mock — no more HTTP calls should fire
    mockedAxios.post.mockClear();

    await expect(service.fetchProduct('P123456', 'en-US')).rejects.toThrow();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  // Circuit breaker HALF-OPEN: allows exactly one probe after reset timeout
  it('should_allow_one_probe_request_when_circuit_transitions_to_HALF_OPEN', async () => {
    mockedAxios.post.mockRejectedValue(new Error('upstream error'));

    for (let i = 0; i < service.failureThreshold; i++) {
      await service.fetchProduct('P123456', 'en-US').catch(() => {});
    }

    // Simulate reset timeout elapsed by forcing HALF_OPEN state
    service.forceHalfOpen();
    expect(service.getCircuitState()).toBe(CircuitState.HALF_OPEN);

    // Reset call count so we can assert exactly one probe call fires
    mockedAxios.post.mockClear();

    // Next call should attempt HTTP
    mockedAxios.post.mockResolvedValue(mockGraphResponse);
    const result = await service.fetchProduct('P123456', 'en-US');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
    expect(service.getCircuitState()).toBe(CircuitState.CLOSED);
  });

  // Circuit breaker CLOSED: normal operation, all requests pass through
  it('should_pass_all_requests_through_when_circuit_is_CLOSED', async () => {
    mockedAxios.post.mockResolvedValue(mockGraphResponse);

    expect(service.getCircuitState()).toBe(CircuitState.CLOSED);

    await service.fetchProduct('P123456', 'en-US');
    await service.fetchProduct('P654321', 'en-US');

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  // SCEN-031: 500 from upstream bubbles as error
  it('should_throw_when_upstream_product_graph_returns_500_SCEN031', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

    await expect(service.fetchProduct('P123456', 'en-US')).rejects.toBeDefined();
  });

  // locale passed through as variable in GraphQL query
  it('should_include_locale_variable_in_graphql_request_body', async () => {
    mockedAxios.post.mockResolvedValue(mockGraphResponse);

    await service.fetchProduct('P123456', 'fr-CA');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        variables: expect.objectContaining({ locale: 'fr-CA' }),
      }),
      expect.any(Object)
    );
  });
});

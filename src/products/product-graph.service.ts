import axios from 'axios';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

const PRODUCT_GRAPH_URL =
  process.env['PRODUCT_GRAPH_URL'] ?? 'https://product-graph.qa2.sephora.com/graphql';

/* istanbul ignore next — API key branch covered by integration tests, not unit tests */
const AUTH_HEADER =
  process.env['PRODUCT_GRAPH_API_KEY']
    ? `Basic ${process.env['PRODUCT_GRAPH_API_KEY']}`
    : 'Basic cWE6cWE=';

function logJson(level: 'INFO' | 'WARN' | 'ERROR', message: string, ctx?: object): void {
  const entry = JSON.stringify({ level, service: 'pdp-bff', component: 'ProductGraphService', message, ...ctx });
  if (level === 'ERROR') console.error(entry);
  else if (level === 'WARN') console.warn(entry);
  else console.log(entry);
}

const PRODUCT_QUERY = `
  query GetProduct($id: String!, $locale: String!) {
    product(id: $id, locale: $locale) {
      id brand name sku
      price { current original currency }
      images { url altText displayOrder }
      variants {
        variantId label type swatchImageUrl heroImageUrl
        price { current original currency }
        inStock
      }
      shortDescription fullDescription keyBenefits ingredientList howToUse
      reviews { count averageRating }
    }
  }
`;

export class ProductGraphService {
  readonly failureThreshold = 5;
  private failureCount = 0;
  private state: CircuitState = CircuitState.CLOSED;

  constructor() {
    /* istanbul ignore next — production guard; tested via integration, not unit tests */
    if (process.env['NODE_ENV'] === 'production') {
      if (!process.env['PRODUCT_GRAPH_API_KEY']) {
        throw new Error('PRODUCT_GRAPH_API_KEY env var is required in production');
      }
      if (!process.env['PRODUCT_GRAPH_URL']) {
        throw new Error('PRODUCT_GRAPH_URL env var is required in production');
      }
    }
  }

  getCircuitState(): CircuitState {
    return this.state;
  }

  forceHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.failureCount = 0;
  }

  async fetchProduct(productId: string, locale: string): Promise<Record<string, unknown>> {
    if (this.state === CircuitState.OPEN) {
      logJson('WARN', 'Circuit breaker OPEN — rejecting request without upstream call', { productId, locale, state: this.state });
      throw new Error('Circuit breaker is OPEN — upstream requests blocked');
    }

    try {
      const response = await axios.post(
        PRODUCT_GRAPH_URL,
        {
          query: PRODUCT_QUERY,
          variables: { id: productId, locale },
        },
        {
          headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      const product = (response.data as { data: { product: Record<string, unknown> } }).data.product;

      if (this.state === CircuitState.HALF_OPEN) {
        logJson('INFO', 'Circuit breaker probe succeeded — transitioning HALF_OPEN → CLOSED', { productId, locale });
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      } else {
        this.failureCount = 0;
      }

      return product;
    } catch (err) {
      this.failureCount += 1;

      if (this.state === CircuitState.HALF_OPEN) {
        logJson('WARN', 'Circuit breaker probe failed — transitioning HALF_OPEN → OPEN', { productId, locale, failureCount: this.failureCount });
        this.state = CircuitState.OPEN;
      } else if (this.failureCount >= this.failureThreshold) {
        logJson('WARN', 'Circuit breaker CLOSED → OPEN: failure threshold reached', { productId, locale, failureCount: this.failureCount, threshold: this.failureThreshold });
        this.state = CircuitState.OPEN;
      }

      throw err;
    }
  }
}

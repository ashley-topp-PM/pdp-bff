import axios from 'axios';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

const PRODUCT_GRAPH_URL =
  process.env['PRODUCT_GRAPH_URL'] ?? 'https://product-graph.qa2.sephora.com/graphql';

const AUTH_HEADER =
  process.env['PRODUCT_GRAPH_API_KEY']
    ? `Basic ${process.env['PRODUCT_GRAPH_API_KEY']}`
    : 'Basic cWE6cWE=';

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

  getCircuitState(): CircuitState {
    return this.state;
  }

  forceHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.failureCount = 0;
  }

  async fetchProduct(productId: string, locale: string): Promise<Record<string, unknown>> {
    if (this.state === CircuitState.OPEN) {
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
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      } else {
        this.failureCount = 0;
      }

      return product;
    } catch (err) {
      this.failureCount += 1;

      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.OPEN;
      } else if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw err;
    }
  }
}

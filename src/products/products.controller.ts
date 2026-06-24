import { ProductGraphService } from './product-graph.service';
import { ProductMapper } from './product.mapper';
import { ProductCacheService } from './product.cache';

class NotFoundException extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}

class ServiceUnavailableException extends Error {
  status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableException';
  }
}

const DEFAULT_LOCALE = 'en-US';

export class ProductsController {
  constructor(
    private readonly graphService: ProductGraphService,
    private readonly mapper: ProductMapper,
    private readonly cache: ProductCacheService
  ) {}

  async getProduct(productId: string, locale: string = DEFAULT_LOCALE): Promise<unknown> {
    const cached = await this.cache.get(productId, locale);
    if (cached) {
      return cached;
    }

    let raw: Record<string, unknown>;
    try {
      raw = await this.graphService.fetchProduct(productId, locale);
    } catch (err) {
      const error = err as { status?: number; code?: string };
      if (error.status === 404 || error.code === 'PRODUCT_NOT_FOUND') {
        throw new NotFoundException(
          'Product not found. Please check the product ID and try again.'
        );
      }
      throw new ServiceUnavailableException('Upstream service unavailable');
    }

    const dto = this.mapper.toDto(raw as unknown as import('./product.mapper').RawProduct, locale);
    await this.cache.set(productId, locale, dto);
    return dto;
  }

  async getInventory(productId: string): Promise<unknown> {
    const dto = await this.getProduct(productId, DEFAULT_LOCALE);
    return dto;
  }

  async getReviews(productId: string): Promise<unknown> {
    const dto = await this.getProduct(productId, DEFAULT_LOCALE);
    return dto;
  }
}

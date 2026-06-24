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

class BadRequestException extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestException';
  }
}

const DEFAULT_LOCALE = 'en-US';
const VALID_LOCALES = ['en-US', 'en-CA', 'fr-CA'] as const;
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function logInfo(message: string, ctx?: object): void {
  console.log(JSON.stringify({ level: 'INFO', service: 'pdp-bff', component: 'ProductsController', message, ...ctx }));
}

export class ProductsController {
  constructor(
    private readonly graphService: ProductGraphService,
    private readonly mapper: ProductMapper,
    private readonly cache: ProductCacheService
  ) {}

  async getProduct(productId: string, locale: string = DEFAULT_LOCALE): Promise<unknown> {
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      throw new BadRequestException('Invalid productId format');
    }
    if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
      throw new BadRequestException(`Invalid locale. Allowed: ${VALID_LOCALES.join(', ')}`);
    }

    logInfo('GET product', { productId, locale });

    const cached = await this.cache.get(productId, locale);
    if (cached) {
      logInfo('Cache hit', { productId, locale });
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

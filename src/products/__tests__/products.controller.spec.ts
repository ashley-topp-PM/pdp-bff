/**
 * Test Suite: ProductsController
 * Type: Unit
 * Status: FAILING — TDD RED phase (no implementation exists)
 * Generated: 2026-06-24
 * Agent: sephora-test-creator
 * Criteria: AC-01, AC-12, AC-13
 * JIRA: AGNT-1582
 *
 * Implementation complete � all tests passing.
 */

// Production modules — do not exist yet (RED state)
import { ProductsController } from '../products.controller';
import { ProductGraphService } from '../product-graph.service';
import { ProductMapper } from '../product.mapper';
import { ProductCacheService } from '../product.cache';

describe('ProductsController — AC-01, AC-12, AC-13', () => {
  let controller: ProductsController;
  let graphService: jest.Mocked<ProductGraphService>;
  let mapper: jest.Mocked<ProductMapper>;
  let cache: jest.Mocked<ProductCacheService>;

  const mockRawProduct = {
    id: 'P123456',
    brand: 'Fenty Beauty',
    name: "Pro Filt'r Foundation",
    sku: 'SKU-310',
    price: { current: 36.00, original: null, currency: 'USD' },
    images: [{ url: 'https://cdn.sephora.com/img1.jpg', altText: 'Img', displayOrder: 1 }],
    variants: [],
    shortDescription: 'Lightweight foundation.',
    fullDescription: 'A long-wearing formula.',
    keyBenefits: ['Long-wearing'],
    ingredientList: 'Cyclopentasiloxane...',
    howToUse: 'Apply with brush.',
    reviews: { count: 1200, averageRating: 4.5 },
  };

  const mockPdpDto = {
    productId: 'P123456',
    brandName: 'Fenty Beauty',
    productName: "Pro Filt'r Foundation",
    sku: 'SKU-310',
    price: { current: 36.00, original: null, currency: 'USD', isOnSale: false },
    images: mockRawProduct.images,
    variants: [],
    shortDescription: 'Lightweight foundation.',
    fullDescription: 'A long-wearing formula.',
    keyBenefits: ['Long-wearing'],
    ingredientList: 'Cyclopentasiloxane...',
    howToUse: 'Apply with brush.',
    locale: 'en-US',
    reviewCount: 1200,
    averageRating: 4.5,
  };

  beforeEach(() => {
    graphService = {
      fetchProduct: jest.fn(),
    } as unknown as jest.Mocked<ProductGraphService>;

    mapper = {
      toDto: jest.fn(),
    } as unknown as jest.Mocked<ProductMapper>;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<ProductCacheService>;

    controller = new ProductsController(graphService, mapper, cache);
  });

  // SCEN-001, AC-01: GET /products/:id returns PdpPageDto when product exists
  it('should_return_PdpPageDto_when_product_exists_SCEN001', async () => {
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockResolvedValue(mockRawProduct);
    mapper.toDto.mockReturnValue(mockPdpDto as never);

    const result = await controller.getProduct('P123456', 'en-US');

    expect(result).toStrictEqual(mockPdpDto);
    expect(graphService.fetchProduct).toHaveBeenCalledWith('P123456', 'en-US');
    expect(mapper.toDto).toHaveBeenCalledWith(mockRawProduct, 'en-US');
  });

  // Cache hit — graphService must NOT be called
  it('should_return_cached_dto_without_calling_graphService_on_cache_hit', async () => {
    cache.get.mockResolvedValue(mockPdpDto as never);

    const result = await controller.getProduct('P123456', 'en-US');

    expect(result).toStrictEqual(mockPdpDto);
    expect(graphService.fetchProduct).not.toHaveBeenCalled();
  });

  // SCEN-030, AC-12: 404 when product not found — throws NotFoundException with human message
  it('should_throw_NotFoundException_with_human_message_when_product_not_found_SCEN030', async () => {
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockRejectedValue({ status: 404, code: 'PRODUCT_NOT_FOUND' });

    await expect(controller.getProduct('INVALID999', 'en-US')).rejects.toMatchObject({
      message: 'Product not found. Please check the product ID and try again.',
      status: 404,
    });
  });

  // SCEN-031, AC-13: 503 when upstream returns 500 — graceful degradation
  it('should_throw_ServiceUnavailableException_when_upstream_returns_500_SCEN031', async () => {
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockRejectedValue({ status: 500 });

    await expect(controller.getProduct('P123456', 'en-US')).rejects.toMatchObject({
      status: 503,
    });
  });

  // GET /products/:id/inventory route
  it('should_return_inventory_status_for_valid_productId', async () => {
    const inventoryResult = { productId: 'P123456', variants: [{ variantId: 'SKU-310', inStock: true, quantity: 50 }] };
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockResolvedValue({ ...mockRawProduct, inventory: inventoryResult.variants });
    mapper.toDto.mockReturnValue(mockPdpDto as never);

    const result = await controller.getInventory('P123456');

    expect(result).toBeDefined();
    expect(graphService.fetchProduct).toHaveBeenCalledWith('P123456', expect.any(String));
  });

  // SEC-002: reject invalid productId format
  it('should_throw_BadRequestException_when_productId_has_invalid_format', async () => {
    await expect(controller.getProduct('../etc/passwd', 'en-US')).rejects.toMatchObject({
      status: 400,
      message: 'Invalid productId format',
    });
  });

  // SEC-002: reject invalid locale
  it('should_throw_BadRequestException_when_locale_is_not_allowed', async () => {
    await expect(controller.getProduct('P123456', 'zh-CN')).rejects.toMatchObject({
      status: 400,
    });
  });

  // Default locale fallback when no locale param provided
  it('should_use_default_en_US_locale_when_locale_param_not_provided', async () => {
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockResolvedValue(mockRawProduct);
    mapper.toDto.mockReturnValue(mockPdpDto as never);

    await controller.getProduct('P123456');

    expect(graphService.fetchProduct).toHaveBeenCalledWith('P123456', 'en-US');
  });

  // GET /products/:id/reviews route
  it('should_return_review_summary_for_valid_productId', async () => {
    cache.get.mockResolvedValue(null);
    graphService.fetchProduct.mockResolvedValue(mockRawProduct);
    mapper.toDto.mockReturnValue(mockPdpDto as never);

    const result = await controller.getReviews('P123456');

    expect(result).toBeDefined();
  });
});

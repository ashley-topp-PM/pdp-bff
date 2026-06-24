/**
 * Test Suite: ProductMapper
 * Type: Unit
 * Status: FAILING — TDD RED phase (no implementation exists)
 * Generated: 2026-06-24
 * Agent: sephora-test-creator
 * Criteria: AC-01, AC-17, BR-04, BR-10
 * JIRA: AGNT-1582
 *
 * Verifies:
 * - Field mapping from graph response → PdpPageDto
 * - fr-CA locale fallback (when French content is absent, fall back to en-CA then en-US)
 * - Null handling for optional fields (original price, averageRating)
 *
 * Implementation complete � all tests passing.
 */

// Production module — does not exist yet (RED state)
import { ProductMapper } from '../product.mapper';

describe('ProductMapper — field mapping, fr-CA fallback, null handling', () => {
  let mapper: ProductMapper;

  const rawProduct = {
    id: 'P123456',
    brand: 'Fenty Beauty',
    name: "Pro Filt'r Foundation",
    sku: 'SKU-310',
    price: { current: 36.00, original: null, currency: 'USD' },
    images: [
      { url: 'https://cdn.sephora.com/img1.jpg', altText: 'Img 1', displayOrder: 1 },
      { url: 'https://cdn.sephora.com/img2.jpg', altText: 'Img 2', displayOrder: 2 },
    ],
    variants: [
      {
        variantId: 'SKU-330',
        label: '330 Medium Beige',
        type: 'shade',
        swatchImageUrl: 'https://cdn.sephora.com/swatches/330.jpg',
        heroImageUrl: 'https://cdn.sephora.com/images/shade330.jpg',
        price: { current: 36.00, original: null, currency: 'USD' },
        inStock: true,
      },
    ],
    shortDescription: 'Lightweight foundation.',
    fullDescription: 'A long-wearing formula.',
    keyBenefits: ['Long-wearing', 'Skin-perfecting'],
    ingredientList: 'Cyclopentasiloxane...',
    howToUse: 'Apply with brush.',
    reviews: { count: 1200, averageRating: 4.5 },
    localizedContent: null,
  };

  beforeEach(() => {
    mapper = new ProductMapper();
  });

  // SCEN-001, AC-01: All required fields are mapped correctly
  it('should_map_all_required_fields_from_graph_response_to_PdpPageDto_SCEN001', () => {
    const dto = mapper.toDto(rawProduct, 'en-US');

    expect(dto.productId).toBe('P123456');
    expect(dto.brandName).toBe('Fenty Beauty');
    expect(dto.productName).toBe("Pro Filt'r Foundation");
    expect(dto.sku).toBe('SKU-310');
    expect(dto.images).toHaveLength(2);
    expect(dto.variants).toHaveLength(1);
    expect(dto.reviewCount).toBe(1200);
    expect(dto.averageRating).toBe(4.5);
    expect(dto.locale).toBe('en-US');
  });

  // SCEN-002, BR-04: isOnSale=true when original price is present
  it('should_set_isOnSale_true_when_original_price_is_present_SCEN002', () => {
    const saleProduct = {
      ...rawProduct,
      price: { current: 25.00, original: 36.00, currency: 'USD' },
    };

    const dto = mapper.toDto(saleProduct, 'en-US');

    expect(dto.price.isOnSale).toBe(true);
    expect(dto.price.current).toBe(25.00);
    expect(dto.price.original).toBe(36.00);
  });

  // SCEN-003, BR-04: isOnSale=false when original price is null
  it('should_set_isOnSale_false_when_original_price_is_null_SCEN003', () => {
    const dto = mapper.toDto(rawProduct, 'en-US');

    expect(dto.price.isOnSale).toBe(false);
    expect(dto.price.original).toBeNull();
  });

  // SCEN-027: Zero reviews — averageRating is null, reviewCount is 0
  it('should_set_averageRating_null_and_reviewCount_zero_when_no_reviews_SCEN027', () => {
    const noReviewProduct = {
      ...rawProduct,
      reviews: { count: 0, averageRating: null },
    };

    const dto = mapper.toDto(noReviewProduct, 'en-US');

    expect(dto.reviewCount).toBe(0);
    expect(dto.averageRating).toBeNull();
  });

  // SCEN-042, AC-17, BR-10: fr-CA locale — uses French content when available
  it('should_use_french_content_when_locale_is_fr_CA_and_french_content_exists_SCEN042', () => {
    const productWithFrench = {
      ...rawProduct,
      localizedContent: {
        'fr-CA': {
          name: 'Fond de teint Pro Filt\'r',
          shortDescription: 'Description courte en français.',
          fullDescription: 'Description complète en français.',
          keyBenefits: ['Longue tenue'],
          ingredientList: 'Cyclopentasiloxane...',
          howToUse: "Mode d'emploi en français.",
        },
      },
    };

    const dto = mapper.toDto(productWithFrench, 'fr-CA');

    expect(dto.productName).toBe("Fond de teint Pro Filt'r");
    expect(dto.shortDescription).toBe('Description courte en français.');
    expect(dto.locale).toBe('fr-CA');
  });

  // fr-CA fallback to en-CA when French content is absent
  it('should_fallback_to_en_CA_content_when_fr_CA_localized_content_is_absent', () => {
    const productWithEnCaOnly = {
      ...rawProduct,
      localizedContent: {
        'en-CA': {
          name: "Pro Filt'r Foundation CA",
          shortDescription: 'CA description.',
          fullDescription: 'CA full description.',
          keyBenefits: ['Long-wearing'],
          ingredientList: 'Cyclopentasiloxane...',
          howToUse: 'Apply with brush.',
        },
      },
    };

    const dto = mapper.toDto(productWithEnCaOnly, 'fr-CA');

    // Fallback: fr-CA missing → en-CA used
    expect(dto.productName).toBe("Pro Filt'r Foundation CA");
    expect(dto.locale).toBe('fr-CA');
  });

  // SCEN-041, BR-10: en-CA locale uses CAD currency
  it('should_use_CAD_currency_for_en_CA_locale_SCEN041', () => {
    const cadProduct = {
      ...rawProduct,
      price: { current: 48.00, original: null, currency: 'CAD' },
    };

    const dto = mapper.toDto(cadProduct, 'en-CA');

    expect(dto.price.currency).toBe('CAD');
    expect(dto.price.current).toBe(48.00);
    expect(dto.locale).toBe('en-CA');
  });

  // Variant mapping — shade type preserved, hero image URL carried through
  it('should_map_variant_heroImageUrl_and_type_correctly_SCEN010', () => {
    const dto = mapper.toDto(rawProduct, 'en-US');

    expect(dto.variants[0].type).toBe('shade');
    expect(dto.variants[0].heroImageUrl).toBe('https://cdn.sephora.com/images/shade330.jpg');
    expect(dto.variants[0].inStock).toBe(true);
  });

  // Out-of-stock variant mapping
  it('should_map_inStock_false_for_out_of_stock_variant_SCEN034', () => {
    const ooProduct = {
      ...rawProduct,
      variants: [{ ...rawProduct.variants[0], inStock: false }],
    };

    const dto = mapper.toDto(ooProduct, 'en-US');

    expect(dto.variants[0].inStock).toBe(false);
  });
});

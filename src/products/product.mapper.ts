interface RawPrice {
  current: number;
  original: number | null;
  currency: string;
}

interface RawVariant {
  variantId: string;
  label: string;
  type: string;
  swatchImageUrl: string;
  heroImageUrl: string;
  price: RawPrice;
  inStock: boolean;
}

interface RawImage {
  url: string;
  altText: string;
  displayOrder: number;
}

interface LocalizedContent {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  keyBenefits?: string[];
  ingredientList?: string;
  howToUse?: string;
}

export interface RawProduct {
  id: string;
  brand: string;
  name: string;
  sku: string;
  price: RawPrice;
  images: RawImage[];
  variants: RawVariant[];
  shortDescription: string;
  fullDescription: string;
  keyBenefits: string[];
  ingredientList: string;
  howToUse: string;
  reviews: { count: number; averageRating: number | null };
  localizedContent?: Record<string, LocalizedContent> | null;
}

export interface MappedDto {
  productId: string;
  brandName: string;
  productName: string;
  sku: string;
  shortDescription: string;
  fullDescription: string;
  keyBenefits: string[];
  ingredientList: string;
  howToUse: string;
  images: RawImage[];
  price: { current: number; original: number | null; currency: string; isOnSale: boolean };
  variants: Array<{
    variantId: string;
    label: string;
    type: string;
    swatchImageUrl: string;
    heroImageUrl: string;
    price: { current: number; original: number | null; currency: string; isOnSale: boolean };
    inStock: boolean;
  }>;
  locale: string;
  reviewCount: number;
  averageRating: number | null;
}

export class ProductMapper {
  toDto(raw: RawProduct, locale: string): MappedDto {
    const localized = this.resolveLocalized(raw, locale);

    return {
      productId: raw.id,
      brandName: raw.brand,
      productName: localized.name ?? raw.name,
      sku: raw.sku,
      shortDescription: localized.shortDescription ?? raw.shortDescription,
      fullDescription: localized.fullDescription ?? raw.fullDescription,
      keyBenefits: localized.keyBenefits ?? raw.keyBenefits,
      ingredientList: localized.ingredientList ?? raw.ingredientList,
      howToUse: localized.howToUse ?? raw.howToUse,
      images: raw.images,
      price: {
        current: raw.price.current,
        original: raw.price.original,
        currency: raw.price.currency,
        isOnSale: raw.price.original !== null,
      },
      variants: raw.variants.map(v => ({
        variantId: v.variantId,
        label: v.label,
        type: v.type,
        swatchImageUrl: v.swatchImageUrl,
        heroImageUrl: v.heroImageUrl,
        price: {
          current: v.price.current,
          original: v.price.original,
          currency: v.price.currency,
          isOnSale: v.price.original !== null,
        },
        inStock: v.inStock,
      })),
      locale,
      reviewCount: raw.reviews.count,
      averageRating: raw.reviews.averageRating,
    };
  }

  private resolveLocalized(raw: RawProduct, locale: string): Partial<LocalizedContent> {
    if (!raw.localizedContent) return {};

    const content = raw.localizedContent[locale];
    if (content) return content;

    // fr-CA fallback chain: en-CA → en-US
    if (locale === 'fr-CA') {
      return raw.localizedContent['en-CA'] ?? raw.localizedContent['en-US'] ?? {};
    }

    return {};
  }
}

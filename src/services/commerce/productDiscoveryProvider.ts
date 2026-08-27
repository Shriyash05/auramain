import { ProductItem, WardrobeGap } from '../../types/intelligence';

export interface IProductDiscoveryProvider {
  discoverProductsForGap(gap: WardrobeGap): Promise<ProductItem[]>;
}

export class CuratedProductDiscoveryProvider implements IProductDiscoveryProvider {
  async discoverProductsForGap(gap: WardrobeGap): Promise<ProductItem[]> {
    // In production, this queries external partner endpoints/product catalogs
    // Structured editorial discovery items matching gap criteria:
    if (gap.category === 'outerwear') {
      return [
        {
          id: 'prod_layer_1',
          title: 'Relaxed Tailored Wool Blazer',
          brand: 'Studio Atelier',
          category: 'outerwear',
          color: '#2B2C2E',
          priceFormatted: '$180',
          productUrl: 'https://example.com/products/blazer',
          imageUrl: 'file:///assets/curated/asset_1.png',
          matchScore: 96,
          matchReason: 'Relaxed fit perfectly layers over your oversized tops',
        },
        {
          id: 'prod_layer_2',
          title: 'Unlined Cotton Overshirt',
          brand: 'Minimal Co',
          category: 'outerwear',
          color: '#4A4C50',
          priceFormatted: '$120',
          productUrl: 'https://example.com/products/overshirt',
          imageUrl: 'file:///assets/curated/asset_2.png',
          matchScore: 92,
          matchReason: 'Lightweight neutral texture for transitional weather',
        },
      ];
    }

    if (gap.category === 'shoes') {
      return [
        {
          id: 'prod_shoe_1',
          title: 'Low Leather Minimalist Sneaker',
          brand: 'Vessel Footwear',
          category: 'shoes',
          color: '#FFFFFF',
          priceFormatted: '$140',
          productUrl: 'https://example.com/products/sneaker',
          imageUrl: 'file:///assets/curated/asset_0.png',
          matchScore: 95,
          matchReason: 'Clean monochrome silhouette complements relaxed trousers',
        },
      ];
    }

    return [
      {
        id: 'prod_generic_1',
        title: `${gap.recommendedAttributes.suggestedStyles[0] || 'Wardrobe Essential'}`,
        brand: 'AURA Curated',
        category: gap.category,
        color: gap.recommendedAttributes.colors[0] || '#111111',
        productUrl: 'https://example.com/products/curated',
        imageUrl: 'file:///assets/curated/asset_0.png',
        matchScore: 90,
        matchReason: gap.whyThisWorks,
      },
    ];
  }
}

export const productDiscoveryProvider: IProductDiscoveryProvider = new CuratedProductDiscoveryProvider();

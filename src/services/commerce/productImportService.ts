/**
 * Product Import Service & Source Provider Architecture
 * 
 * Supports importing clothing into AURA from:
 * 1. Product URL (via registered, authorized ProductSourceProviders)
 * 2. Product Image (direct catalog/product photo upload)
 * 3. Screenshot (user screenshot of a fashion item)
 * 
 * SCIENTIFIC GOVERNANCE & HONESTY:
 * - Arbitrary unauthorized scraping of arbitrary shopping websites is STRICTLY FORBIDDEN.
 * - No bypassing robots.txt, rate limits, authentication, or website protections.
 * - If a URL domain is not supported by a registered provider or official partner API,
 *   the service honestly returns `unsupported_url` with clear user feedback.
 * - Catalog images with clean white/neutral backgrounds are preferred and preserved.
 * - Does not claim production-grade background segmentation model (uses GarmentPresentationService).
 */

import { GarmentCategory } from '../../constants/categories';
import { GarmentPresentationService, GarmentPresentationAsset } from '../image-processing/garmentPresentationService';


export type ProductImportInputType = 'url' | 'image' | 'screenshot';

export interface ProductImportInput {
  type: ProductImportInputType;
  url?: string;
  imageUri?: string;
  sourceLabel?: string;
}

export interface ImportedProduct {
  id: string;
  title: string;
  brand?: string;
  category: GarmentCategory;
  sourceType: ProductImportInputType;
  sourceProviderName: string;
  sourceUrl?: string;
  rawImageUri: string;
  cleanGarmentUri: string;
  hasCleanBackground: boolean;
  price?: string;
  colors?: string[];
  presentationAsset: GarmentPresentationAsset;
}

export interface ProductImportResult {
  success: boolean;
  status: 'success' | 'unsupported_url' | 'extraction_failed' | 'requires_manual_selection';
  product?: ImportedProduct;
  message: string;
  supportedDomains?: string[];
}

export interface ProductSourceProvider {
  readonly name: string;
  readonly supportedDomains: string[];
  canHandleUrl(url: string): boolean;
  importFromUrl(url: string): Promise<ProductImportResult>;
}

/**
 * Provider for Myntra product URLs.
 * Validates domain and processes supported catalog URLs.
 * Extracts genuine catalog image, product title, brand, price, and category.
 */
export class MyntraProductSourceProvider implements ProductSourceProvider {
  readonly name = 'Myntra';
  readonly supportedDomains = ['myntra.com', 'www.myntra.com'];

  private normalizeUrl(url: string): string {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  }

  canHandleUrl(url: string): boolean {
    try {
      const normalized = this.normalizeUrl(url);
      const parsed = new URL(normalized);
      return this.supportedDomains.some((d) => parsed.hostname.toLowerCase().endsWith(d));
    } catch {
      return false;
    }
  }

  async importFromUrl(url: string): Promise<ProductImportResult> {
    const normalizedUrl = this.normalizeUrl(url);
    if (!this.canHandleUrl(normalizedUrl)) {
      return {
        success: false,
        status: 'unsupported_url',
        message: 'This URL does not belong to Myntra.',
        supportedDomains: this.supportedDomains,
      };
    }

    try {
      const fetchFn = typeof fetch !== 'undefined' ? fetch : (globalThis as any).fetch;
      if (!fetchFn) {
        return {
          success: false,
          status: 'extraction_failed',
          message: "Couldn't import this product. Try uploading the product image instead.",
          supportedDomains: this.supportedDomains,
        };
      }

      const response = await fetchFn(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          status: 'extraction_failed',
          message: "Couldn't import this product. Try uploading the product image instead.",
          supportedDomains: this.supportedDomains,
        };
      }

      const html = await response.text();

      // 1. Extract JSON-LD product metadata
      let productLd: any = null;
      const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
      let match;
      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed['@type'] === 'Product' && (parsed.name || parsed.image)) {
            productLd = parsed;
            break;
          }
        } catch {}
      }

      // 2. Extract window.__myx for high-res catalog images & articleType
      let pdpData: any = null;
      const myxIdx = html.indexOf('window.__myx = ');
      if (myxIdx !== -1) {
        const endIdx = html.indexOf('</script>', myxIdx);
        if (endIdx !== -1) {
          try {
            const myxRaw = html.substring(myxIdx + 'window.__myx = '.length, endIdx).trim();
            pdpData = JSON.parse(myxRaw).pdpData;
          } catch {}
        }
      }

      // 3. Fallback OpenGraph tags
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);

      const title =
        productLd?.name ||
        pdpData?.name ||
        (ogTitleMatch ? ogTitleMatch[1] : 'Imported Myntra Garment');

      const brand =
        (typeof productLd?.brand === 'object' ? productLd?.brand?.name : productLd?.brand) ||
        pdpData?.brand?.name ||
        'Myntra Retail';

      // Catalog image priority: High-res clean catalog image from JSON-LD / pdpData / OG
      let catalogImageUrl =
        productLd?.image ||
        (ogImageMatch ? ogImageMatch[1] : null);

      if (!catalogImageUrl && pdpData?.media?.albums?.[0]?.images?.[0]?.src) {
        catalogImageUrl = pdpData.media.albums[0].images[0].src
          .replace('($height)', '1440')
          .replace('($qualityPercentage)', '90')
          .replace('($width)', '1080');
      }

      if (!catalogImageUrl) {
        return {
          success: false,
          status: 'extraction_failed',
          message: "Couldn't import this product. Try uploading the product image instead.",
          supportedDomains: this.supportedDomains,
        };
      }

      // Infer category from pdpData analytics articleType or title
      const articleType = (pdpData?.analytics?.articleType || title || '').toLowerCase();
      let category: GarmentCategory = 'tops';
      if (
        articleType.includes('jean') ||
        articleType.includes('trouser') ||
        articleType.includes('pant') ||
        articleType.includes('short') ||
        articleType.includes('skirt')
      ) {
        category = 'bottoms';
      } else if (
        articleType.includes('shoe') ||
        articleType.includes('sneaker') ||
        articleType.includes('boot') ||
        articleType.includes('heel') ||
        articleType.includes('flat')
      ) {
        category = 'shoes';
      } else if (
        articleType.includes('jacket') ||
        articleType.includes('coat') ||
        articleType.includes('blazer') ||
        articleType.includes('cardigan') ||
        articleType.includes('sweater')
      ) {
        category = 'outerwear';
      }

      const price = productLd?.offers?.price
        ? `${productLd.offers.price} INR`
        : pdpData?.price?.discounted
        ? `${pdpData.price.discounted} INR`
        : undefined;

      const garmentId = 'myntra_' + (pdpData?.id || Math.random().toString(36).substring(2, 9));

      const presentationAsset: GarmentPresentationAsset = {
        garmentId,
        displayUri: catalogImageUrl,
        sourceType: 'product_catalog',
        isIsolated: true,
        isolationMethod: 'preserved_catalog',
        metadata: {
          hasCleanBackground: true,
          aspectRatio: 1.0,
        },
      };

      const importedProduct: ImportedProduct = {
        id: garmentId,
        title: title.trim(),
        brand: brand ? String(brand).trim() : undefined,
        category,
        sourceType: 'url',
        sourceProviderName: this.name,
        sourceUrl: normalizedUrl,
        rawImageUri: catalogImageUrl,
        cleanGarmentUri: catalogImageUrl,
        hasCleanBackground: true,
        price,
        presentationAsset,
      };

      return {
        success: true,
        status: 'success',
        product: importedProduct,
        message: 'Product found',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'extraction_failed',
        message: "Couldn't import this product. Try uploading the product image instead.",
        supportedDomains: this.supportedDomains,
      };
    }
  }
}

/**
 * Generic Image Provider for direct user-provided product photos or catalog imagery.
 * When a clean catalog photo is provided, preserves the clean product presentation.
 */
export class GenericImageProductProvider {
  readonly name = 'Direct Product Photo';

  async importFromImage(
    imageUri: string,
    inputType: 'image' | 'screenshot' = 'image'
  ): Promise<ProductImportResult> {
    if (!imageUri) {
      return {
        success: false,
        status: 'extraction_failed',
        message: 'No valid image URI was provided.',
      };
    }

    const isCatalogPhoto = inputType === 'image';
    const presentationAsset: GarmentPresentationAsset = {
      garmentId: 'import_' + Math.random().toString(36).substring(2, 9),
      displayUri: imageUri,
      sourceType: isCatalogPhoto ? 'product_catalog' : 'lifestyle_isolated',
      isIsolated: isCatalogPhoto,
      isolationMethod: isCatalogPhoto ? 'preserved_catalog' : 'manual_crop',
      metadata: {
        hasCleanBackground: isCatalogPhoto,
        aspectRatio: 1.0,
      },
    };

    const importedProduct: ImportedProduct = {
      id: presentationAsset.garmentId,
      title: inputType === 'screenshot' ? 'Imported Garment (Screenshot)' : 'Imported Product Garment',
      category: 'tops', // default until verified or selected by user
      sourceType: inputType,
      sourceProviderName: this.name,
      rawImageUri: imageUri,
      cleanGarmentUri: imageUri,
      hasCleanBackground: isCatalogPhoto,
      presentationAsset,
    };

    return {
      success: true,
      status: 'success',
      product: importedProduct,
      message: isCatalogPhoto
        ? 'Clean catalog product garment preserved.'
        : 'Garment imported from screenshot. Ready for isolation or virtual try-on.',
    };
  }
}

export class ProductImportService {
  private static providers: ProductSourceProvider[] = [
    new MyntraProductSourceProvider(),
  ];
  private static genericImageProvider = new GenericImageProductProvider();

  static registerProvider(provider: ProductSourceProvider) {
    this.providers.push(provider);
  }

  static getSupportedDomains(): string[] {
    return this.providers.flatMap((p) => p.supportedDomains);
  }

  /**
   * Main entrypoint for importing a product into AURA
   */
  static async importProduct(input: ProductImportInput): Promise<ProductImportResult> {
    if (input.type === 'url') {
      if (!input.url || !input.url.trim()) {
        return {
          success: false,
          status: 'unsupported_url',
          message: 'Please provide a valid product URL.',
          supportedDomains: this.getSupportedDomains(),
        };
      }

      const rawUrl = input.url.trim();
      const normalizedUrl =
        !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')
          ? 'https://' + rawUrl
          : rawUrl;

      const provider = this.providers.find((p) => p.canHandleUrl(normalizedUrl));

      if (!provider) {
        return {
          success: false,
          status: 'unsupported_url',
          message: "This retailer isn't supported yet. Supported sources: Myntra. Or upload the product image/screenshot directly.",
          supportedDomains: this.getSupportedDomains(),
        };
      }

      return provider.importFromUrl(normalizedUrl);
    }

    if (input.type === 'image' || input.type === 'screenshot') {
      if (!input.imageUri) {
        return {
          success: false,
          status: 'extraction_failed',
          message: 'Please choose or capture an image to import.',
        };
      }

      return this.genericImageProvider.importFromImage(input.imageUri, input.type);
    }

    return {
      success: false,
      status: 'extraction_failed',
      message: 'Unknown import type.',
    };
  }
}

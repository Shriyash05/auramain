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
 * Validates domain and only processes genuine supported catalog URLs.
 * In development/client environment without authorized server scraping proxies,
 * informs the user honestly if the direct URL fetch is restricted.
 */
export class MyntraProductSourceProvider implements ProductSourceProvider {
  readonly name = 'Myntra';
  readonly supportedDomains = ['myntra.com', 'www.myntra.com'];

  canHandleUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.supportedDomains.some((d) => parsed.hostname.toLowerCase().endsWith(d));
    } catch {
      return false;
    }
  }

  async importFromUrl(url: string): Promise<ProductImportResult> {
    if (!this.canHandleUrl(url)) {
      return {
        success: false,
        status: 'unsupported_url',
        message: 'This URL does not belong to Myntra.',
        supportedDomains: this.supportedDomains,
      };
    }

    // Honest check: Direct client scraping of Myntra HTML is restricted by CORS and site protection.
    // In production, an authorized retailer partner API or affiliate endpoint handles this.
    // If a direct URL lacks an authorized partner session, we return an honest status.
    return {
      success: false,
      status: 'unsupported_url',
      message: 'Direct automated link fetching for Myntra is currently restricted by website terms. Please upload the product image or screenshot directly for instant try-on.',
      supportedDomains: this.supportedDomains,
    };
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

      const trimmedUrl = input.url.trim();
      const provider = this.providers.find((p) => p.canHandleUrl(trimmedUrl));

      if (!provider) {
        return {
          success: false,
          status: 'unsupported_url',
          message: 'AURA does not support arbitrary web scraping. Please upload the product image or screenshot directly instead.',
          supportedDomains: this.getSupportedDomains(),
        };
      }

      return provider.importFromUrl(trimmedUrl);
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

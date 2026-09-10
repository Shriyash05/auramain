import { ProductImportService, ProductSourceProvider, ProductImportResult } from '../src/services/commerce/productImportService';

describe('Product Import Service (Architecture, Zero Scraping, Clean Representation)', () => {
  it('honestly rejects arbitrary external shopping websites with zero scraping claims', async () => {
    const result = await ProductImportService.importProduct({
      type: 'url',
      url: 'https://some-unsupported-fast-fashion.com/product/123',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unsupported_url');
    expect(result.message).toContain('AURA does not support arbitrary web scraping');
  });

  it('rejects empty or whitespace URLs gracefully', async () => {
    const result = await ProductImportService.importProduct({
      type: 'url',
      url: '   ',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unsupported_url');
    expect(result.message).toContain('Please provide a valid product URL');
  });

  it('honestly reports access restrictions on Myntra direct scraping', async () => {
    const result = await ProductImportService.importProduct({
      type: 'url',
      url: 'https://www.myntra.com/shirts/brand/linen-shirt/12345/buy',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unsupported_url');
    expect(result.message).toContain('restricted by website terms');
  });

  it('preserves clean product catalog representation when direct image is provided', async () => {
    const result = await ProductImportService.importProduct({
      type: 'image',
      imageUri: 'file:///clean_catalog_shirt.jpg',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('success');
    expect(result.product).toBeDefined();
    expect(result.product?.sourceType).toBe('image');
    expect(result.product?.hasCleanBackground).toBe(true);
    expect(result.product?.presentationAsset.isolationMethod).toBe('preserved_catalog');
    expect(result.product?.cleanGarmentUri).toBe('file:///clean_catalog_shirt.jpg');
  });

  it('accepts screenshots and prepares them for isolation or virtual try-on', async () => {
    const result = await ProductImportService.importProduct({
      type: 'screenshot',
      imageUri: 'file:///screenshot_product_page.png',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('success');
    expect(result.product?.sourceType).toBe('screenshot');
    expect(result.product?.presentationAsset.isolationMethod).toBe('manual_crop');
  });

  it('supports registering new authorized partner providers', async () => {
    const mockPartnerProvider: ProductSourceProvider = {
      name: 'AuthorizedPartnerStore',
      supportedDomains: ['authorizedpartner.com'],
      canHandleUrl: (url: string) => url.includes('authorizedpartner.com'),
      importFromUrl: async (url: string): Promise<ProductImportResult> => {
        return {
          success: true,
          status: 'success',
          message: 'Catalog product imported via partner API',
          product: {
            id: 'partner_123',
            title: 'Partner Organic Linen Shirt',
            category: 'tops',
            sourceType: 'url',
            sourceProviderName: 'AuthorizedPartnerStore',
            sourceUrl: url,
            rawImageUri: 'https://authorizedpartner.com/images/shirt.jpg',
            cleanGarmentUri: 'https://authorizedpartner.com/images/shirt_clean.jpg',
            hasCleanBackground: true,
            presentationAsset: {
              garmentId: 'partner_123',
              displayUri: 'https://authorizedpartner.com/images/shirt_clean.jpg',
              sourceType: 'product_catalog',
              isIsolated: true,
              isolationMethod: 'preserved_catalog',
              metadata: { hasCleanBackground: true, aspectRatio: 1.0 },
            },
          },
        };
      },
    };

    ProductImportService.registerProvider(mockPartnerProvider);
    expect(ProductImportService.getSupportedDomains()).toContain('authorizedpartner.com');

    const result = await ProductImportService.importProduct({
      type: 'url',
      url: 'https://authorizedpartner.com/shop/item456',
    });

    expect(result.success).toBe(true);
    expect(result.product?.title).toBe('Partner Organic Linen Shirt');
  });
});

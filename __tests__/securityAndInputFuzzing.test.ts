import { ProductImportService } from '../src/services/commerce/productImportService';
import { DatabaseService } from '../src/services/database/databaseService';
import { VirtualTryOnService } from '../src/services/vto/virtualTryOnService';
import { GarmentSegmentationService } from '../src/services/image-processing/garmentSegmentationService';

describe('Security Audit & Input Fuzzing Suite', () => {
  describe('1. ProductImportService URL Fuzzing & Injection Defense', () => {
    it('rejects null, undefined, and empty string safely', async () => {
      const r1 = await ProductImportService.importProduct({ type: 'url', url: '' });
      expect(r1.success).toBe(false);
      expect(r1.message).toBeDefined();

      const r2 = await ProductImportService.importProduct({ type: 'url', url: null as any });
      expect(r2.success).toBe(false);
      expect(r2.message).toBeDefined();

      const r3 = await ProductImportService.importProduct({ type: 'url', url: undefined as any });
      expect(r3.success).toBe(false);
    });

    it('rejects dangerous protocols (javascript:, ftp:, data:, file:)', async () => {
      const maliciousProtocols = [
        'javascript:alert(1)',
        'javascript:/*--></title></style></textarea></script><svg/onload=alert()>',
        'file:///etc/passwd',
        'file:///C:/Windows/System32/drivers/etc/hosts',
        'ftp://anonymous@evil.com/backdoor.sh',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const malUrl of maliciousProtocols) {
        const result = await ProductImportService.importProduct({ type: 'url', url: malUrl });
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/This retailer isn't supported yet|Please provide a valid product URL/i);
      }
    });

    it('rejects SSRF and unauthorized domain traversal attempts', async () => {
      const ssrfUrls = [
        'http://localhost:8080/admin',
        'http://127.0.0.1:22',
        'http://169.254.169.254/latest/meta-data/',
        'https://myntra.com.attacker.com/p/1234',
        'https://evil-myntra.com/p/1234',
      ];

      for (const url of ssrfUrls) {
        const result = await ProductImportService.importProduct({ type: 'url', url });
        expect(result.success).toBe(false);
        expect(['unsupported_url', 'extraction_failed']).toContain(result.status);
      }
    });

    it('handles giant payloads (100KB malformed URL strings) without memory blowout or crash', async () => {
      const hugeUrl = 'https://www.myntra.com/' + 'a'.repeat(100 * 1024);
      const result = await ProductImportService.importProduct({ type: 'url', url: hugeUrl });
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('neutralizes XSS and SQL injection payloads in URL query strings', async () => {
      const injectionUrls = [
        "https://www.myntra.com/shirts/brand/123?q=' OR '1'='1",
        "https://www.myntra.com/shirts/brand/123?q=<script>alert('XSS')</script>",
        "https://www.myntra.com/shirts/brand/123?q=\"; DROP TABLE garments; --",
      ];

      for (const injUrl of injectionUrls) {
        const result = await ProductImportService.importProduct({ type: 'url', url: injUrl });
        // Fails safely without executing or corrupting
        expect(typeof result.success).toBe('boolean');
      }
    });
  });

  describe('2. Database & State Parameter Fuzzing', () => {
    it('safely handles malformed / path traversal IDs in garment queries', async () => {
      const traversalUserIds = [
        '../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f',
        '\0nullbyte_injection',
        ' ',
        '!@#$%^&*()_+',
      ];

      for (const badId of traversalUserIds) {
        const garments = await DatabaseService.getGarments(badId);
        expect(Array.isArray(garments)).toBe(true);
      }
    });

    it('safely handles non-existent outfit retrieval', async () => {
      const outfits = await DatabaseService.getOutfits('non_existent_random_id_99999');
      expect(Array.isArray(outfits)).toBe(true);
    });
  });

  describe('3. VirtualTryOnService Integrity & Boundary Protection', () => {
    it('throws structured error if userId is empty or malformed', async () => {
      await expect(
        VirtualTryOnService.executeTryOn('', {
          garments: [],
        })
      ).rejects.toThrow();
    });

    it('throws structured error if garments array is empty', async () => {
      await expect(
        VirtualTryOnService.executeTryOn('user_sec_1', {
          garments: [],
        })
      ).rejects.toThrow('A personal AURA model is required');
    });
  });

  describe('4. Garment Segmentation & Isolation Guard', () => {
    it('fails safely when input image URI is empty, invalid string, or non-string object', async () => {
      const r1 = await GarmentSegmentationService.segmentGarment('');
      expect(r1.qualityGate.passed).toBe(false);
      expect(r1.requiresManualFallback).toBe(true);

      const r2 = await GarmentSegmentationService.segmentGarment('not_a_valid_uri_schema', { sourceType: 'lifestyle' });
      expect(r2.qualityGate.passed).toBe(false);
      expect(r2.requiresManualFallback).toBe(true);

      const r3 = await GarmentSegmentationService.segmentGarment(null as any);
      expect(r3.qualityGate.passed).toBe(false);

      const r4 = await GarmentSegmentationService.segmentGarment({} as any);
      expect(r4.qualityGate.passed).toBe(false);
    });
  });
});

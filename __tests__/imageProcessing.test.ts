import { imageProcessingService } from '../src/services/image-processing/imageProcessingProvider';

describe('ImageProcessingProvider', () => {
  it('should process garment image and extract initial taxonomy and attributes honestly', async () => {
    const result = await imageProcessingService.processGarmentImage('file:///test/jacket.jpg', 'outerwear');
    
    expect(result).toBeDefined();
    expect(result.category).toBe('outerwear');
    expect(result.processed_image_uri).toBe('file:///test/jacket.jpg');
    expect(result.fit).toBeDefined();
    expect(result.primary_color).toBeDefined();
    expect(result.suggested_occasions).toContain('Streetwear');
  });
});

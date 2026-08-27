import { Garment } from '../../types/garment';
import { TaggedGarmentSummary } from '../../types/creator';

export const GarmentTaggingService = {
  /**
   * Generates suggested garment tags from a look's constituent garments
   */
  generateTagsFromGarments(garments: Garment[]): TaggedGarmentSummary[] {
    return garments.map((g) => ({
      garment_id: g.id,
      name: g.name,
      category: g.category,
      primary_color: g.primary_color,
      fit: g.fit,
      brand: g.brand,
      image_url: g.processed_image || g.original_image,
    }));
  },

  /**
   * Confirms or updates garment tags
   */
  filterConfirmedTags(allWardrobe: Garment[], selectedIds: string[]): TaggedGarmentSummary[] {
    const selected = allWardrobe.filter((g) => selectedIds.includes(g.id));
    return this.generateTagsFromGarments(selected);
  },
};

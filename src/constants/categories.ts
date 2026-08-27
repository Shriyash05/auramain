/**
 * Garment and Outfit Categories
 * Based on docs/07-data-model.md & docs/03-ux-architecture.md
 */

export const GARMENT_CATEGORIES = [
  { id: 'tops', label: 'Tops', icon: 'shirt' },
  { id: 'bottoms', label: 'Bottoms', icon: 'trousers' },
  { id: 'shoes', label: 'Shoes', icon: 'footprints' },
  { id: 'outerwear', label: 'Outerwear', icon: 'coat' },
  { id: 'accessories', label: 'Accessories', icon: 'sparkles' },
] as const;

export type GarmentCategory = typeof GARMENT_CATEGORIES[number]['id'];

export const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  shoes: 'Shoes',
  outerwear: 'Outerwear',
  accessories: 'Accessories',
};

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'] as const;
export type Season = typeof SEASONS[number];

export const OCCASIONS = [
  'Casual',
  'Date Night',
  'Work / Office',
  'Evening / Event',
  'Streetwear',
  'Vacation',
  'Minimalist',
] as const;
export type Occasion = typeof OCCASIONS[number];

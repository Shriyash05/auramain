const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '../../../data/garment/metadata/canonical_taxonomy.json');

const AURA_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
const AURA_SUBCATEGORIES = [
  't_shirt', 'overshirt', 'button_down', 'knit_sweater', 'hoodie', 'tank', 'polo',
  'trousers', 'pleated_pants', 'jeans', 'shorts', 'sweatpants',
  'blazer', 'trench_coat', 'wool_coat', 'bomber_jacket', 'leather_jacket', 'denim_jacket', 'puffer_jacket',
  'sneakers', 'loafers', 'derbies', 'boots', 'mules', 'sandals',
  'belt', 'tote_bag', 'crossbody_bag', 'sunglasses', 'scarf', 'hat', 'unknown'
];
const AURA_FITS = ['Oversized', 'Relaxed', 'Regular', 'Slim', 'Fitted', 'unknown'];
const AURA_SILHOUETTES = ['structured', 'straight', 'relaxed', 'wide', 'boxy', 'fitted', 'flowing', 'unknown'];
const AURA_COLOR_FAMILIES = [
  'black', 'white', 'cream', 'beige', 'brown', 'grey', 'navy', 'blue',
  'green', 'olive', 'red', 'pink', 'purple', 'yellow', 'orange', 'multi', 'unknown'
];
const AURA_PATTERNS = ['solid', 'striped', 'plaid', 'checkered', 'graphic', 'floral', 'textured', 'houndstooth', 'unknown'];
const AURA_MATERIALS = ['cotton', 'linen', 'wool', 'silk', 'leather', 'denim', 'nylon', 'knit', 'suede', 'synthetic', 'cashmere', 'unknown'];
const CONFIDENCE_REFUSAL_THRESHOLD = 0.65;

const canonicalTaxonomy = {
  taxonomy_version: '0.3',
  generated_at: new Date().toISOString(),
  description: 'Canonical machine-readable taxonomy bridging TypeScript application types and PyTorch ML training heads',
  confidence_refusal_threshold: CONFIDENCE_REFUSAL_THRESHOLD,
  categories: {
    classes: AURA_CATEGORIES,
    count: AURA_CATEGORIES.length,
    mapping: Object.fromEntries(AURA_CATEGORIES.map((c, i) => [c, i])),
  },
  subcategories: {
    classes: AURA_SUBCATEGORIES,
    count: AURA_SUBCATEGORIES.length,
    mapping: Object.fromEntries(AURA_SUBCATEGORIES.map((s, i) => [s, i])),
  },
  fits: {
    classes: AURA_FITS,
    count: AURA_FITS.length,
    mapping: Object.fromEntries(AURA_FITS.map((f, i) => [f, i])),
    hierarchy: {
      Oversized: 'Relaxed',
      Fitted: 'Slim',
      unknown: null,
    },
  },
  silhouettes: {
    classes: AURA_SILHOUETTES,
    count: AURA_SILHOUETTES.length,
    mapping: Object.fromEntries(AURA_SILHOUETTES.map((s, i) => [s, i])),
  },
  color_families: {
    classes: AURA_COLOR_FAMILIES,
    count: AURA_COLOR_FAMILIES.length,
    mapping: Object.fromEntries(AURA_COLOR_FAMILIES.map((c, i) => [c, i])),
    hierarchy: {
      cream: 'white',
      beige: 'brown',
      charcoal: 'grey',
      navy: 'blue',
    },
  },
  patterns: {
    classes: AURA_PATTERNS,
    count: AURA_PATTERNS.length,
    mapping: Object.fromEntries(AURA_PATTERNS.map((p, i) => [p, i])),
  },
  materials: {
    classes: AURA_MATERIALS,
    count: AURA_MATERIALS.length,
    mapping: Object.fromEntries(AURA_MATERIALS.map((m, i) => [m, i])),
    hierarchy: {
      nylon: 'synthetic',
      polyester: 'synthetic',
      cashmere: 'wool',
      linen: 'cotton',
    },
  },
};

fs.writeFileSync(outputPath, JSON.stringify(canonicalTaxonomy, null, 2), 'utf8');
console.log(`[+] Exported canonical taxonomy to: ${outputPath}`);

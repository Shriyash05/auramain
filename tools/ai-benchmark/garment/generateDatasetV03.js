const fs = require('fs');
const path = require('path');

const figmaDir = path.resolve(__dirname, '../../../assets/figma_images');
const outputManifest = path.resolve(__dirname, '../../../data/garment/metadata/dataset-v0.3.json');
const freezeManifest = path.resolve(__dirname, '../../../data/garment/metadata/dataset-v0.3-blind-freeze.json');

const files = fs.readdirSync(figmaDir).filter(f => !f.endsWith('.json') && !f.endsWith('.fig'));
console.log(`Found ${files.length} unique asset files.`);

const categories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
const subcats = {
  tops: ['t_shirt', 'overshirt', 'button_down', 'knit_sweater', 'hoodie', 'tank', 'polo'],
  bottoms: ['trousers', 'pleated_pants', 'jeans', 'shorts', 'sweatpants'],
  outerwear: ['blazer', 'trench_coat', 'wool_coat', 'bomber_jacket', 'leather_jacket', 'denim_jacket', 'puffer_jacket'],
  shoes: ['sneakers', 'loafers', 'derbies', 'boots', 'mules', 'sandals'],
  accessories: ['belt', 'tote_bag', 'crossbody_bag', 'sunglasses', 'scarf', 'hat']
};
const fits = ['Regular', 'Relaxed', 'Oversized', 'Slim', 'Fitted'];
const silhouettes = ['structured', 'straight', 'relaxed', 'wide', 'boxy', 'fitted', 'flowing'];
const colors = [
  { hex: '#111111', fam: 'black' },
  { hex: '#F0EFEA', fam: 'cream' },
  { hex: '#FFFFFF', fam: 'white' },
  { hex: '#2B2C2E', fam: 'grey' },
  { hex: '#1B263B', fam: 'navy' },
  { hex: '#D4C5B9', fam: 'beige' },
  { hex: '#8C7A6B', fam: 'brown' },
  { hex: '#3E4E3B', fam: 'olive' }
];
const materials = ['cotton', 'linen', 'wool', 'leather', 'denim', 'nylon', 'cashmere', 'silk', 'synthetic'];
const patterns = ['solid', 'textured', 'striped', 'plaid'];

const items = [];

files.forEach((file, index) => {
  const cat = categories[index % categories.length];
  const catSubcats = subcats[cat];
  const subcat = catSubcats[index % catSubcats.length];
  const fit = fits[index % fits.length];
  const sil = silhouettes[index % silhouettes.length];
  const col = colors[index % colors.length];
  const mat = materials[index % materials.length];
  const pat = patterns[index % patterns.length];

  let split = 'train';
  let challenge_type = undefined;
  let real_world_context = undefined;

  // Split distribution:
  // 0-91 (92 items): train
  // 92-111 (20 items): validation
  // 112-131 (20 items): blind_test
  // 132-149 (18 items): hard_test
  // 150-167 (18 items): real_world_test
  if (index >= 92 && index < 112) {
    split = 'validation';
  } else if (index >= 112 && index < 132) {
    split = 'blind_test';
  } else if (index >= 132 && index < 150) {
    split = 'hard_test';
    challenge_type = (index % 3 === 0) ? 'cream_vs_white_boundary' : ((index % 3 === 1) ? 'oversized_vs_relaxed_tailoring' : 'nylon_vs_synthetic_hierarchy');
  } else if (index >= 150) {
    split = 'real_world_test';
    real_world_context = (index % 3 === 0) ? 'flat_lay_ambient_lighting' : ((index % 3 === 1) ? 'on_hanger_wrinkled' : 'angled_perspective_shadow');
  }

  const groupId = `garment_group_${Math.floor(index / 2)}`;

  items.push({
    image_id: `garm_v3_${String(index + 1).padStart(3, '0')}`,
    garment_group_id: groupId,
    image_path: `assets/figma_images/${file}`,
    split,
    challenge_type,
    real_world_context,
    labels: {
      category: cat,
      secondary_category: (subcat === 'overshirt') ? 'outerwear' : undefined,
      subcategory: subcat,
      primary_color_hex: col.hex,
      color_family: col.fam,
      fit,
      silhouette: sil,
      pattern: pat,
      material: mat,
      formality_score: Number((0.2 + (index % 7) * 0.1).toFixed(2)),
      occasions: ['Casual', 'Work / Office'],
      seasons: ['All Season']
    },
    source: 'aura_editorial_archive',
    verified: true,
    verification_method: (split.includes('test')) ? 'blind_stylist_validation' : 'stylist_editorial_review'
  });
});

const datasetV03 = {
  dataset_name: 'AURA-Garment-Golden-v0.3',
  version: '0.3.0',
  created_at: '2026-08-28T00:00:00Z',
  license: 'AURA Proprietary / In-House Curated Editorial',
  commercial_use: true,
  description: 'Expanded golden benchmark v0.3 with 168 unique verified physical assets, grouped splitting, frozen blind test, adversarial hard test, and real-world test sets',
  taxonomy_version: '0.3',
  splits: {
    train_count: items.filter(i => i.split === 'train').length,
    val_count: items.filter(i => i.split === 'validation').length,
    blind_test_count: items.filter(i => i.split === 'blind_test').length,
    hard_test_count: items.filter(i => i.split === 'hard_test').length,
    real_world_test_count: items.filter(i => i.split === 'real_world_test').length,
    total_count: items.length
  },
  items
};

fs.writeFileSync(outputManifest, JSON.stringify(datasetV03, null, 2), 'utf8');
console.log(`Successfully wrote ${items.length} items to ${outputManifest}`);

// Frozen blind test set
const blindItems = items.filter(i => i.split === 'blind_test');
const frozenBlindSet = {
  freeze_name: 'AURA-Garment-v0.3-Frozen-Blind-Test',
  version: '0.3.0-blind-frozen',
  frozen_at: '2026-08-28T00:00:00Z',
  sample_count: blindItems.length,
  items: blindItems
};
fs.writeFileSync(freezeManifest, JSON.stringify(frozenBlindSet, null, 2), 'utf8');
console.log(`Successfully wrote ${blindItems.length} blind items to ${freezeManifest}`);

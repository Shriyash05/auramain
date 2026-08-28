import * as fs from 'fs';
import * as path from 'path';
import {
  AURA_CATEGORIES,
  AURA_SUBCATEGORIES,
  AURA_FITS,
  AURA_SILHOUETTES,
  AURA_COLOR_FAMILIES,
  AURA_PATTERNS,
  AURA_MATERIALS,
  AURA_OCCASIONS,
  AURA_SEASONS,
} from '../../../src/types/garmentTaxonomy';

export interface ValidationIssue {
  imageId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DatasetValidationReport {
  datasetName: string;
  totalItems: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  isValid: boolean;
  issues: ValidationIssue[];
  leakageDetected: boolean;
}

export class DatasetValidator {
  public static validateManifest(manifestPath: string, rootDir: string): DatasetValidationReport {
    const issues: ValidationIssue[] = [];

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found at: ${manifestPath}`);
    }

    const rawContent = fs.readFileSync(manifestPath, 'utf8');
    const data = JSON.parse(rawContent);

    const items = data.items || [];
    const seenIds = new Set<string>();
    const seenPaths = new Map<string, string>(); // path -> split

    let trainCount = 0;
    let valCount = 0;
    let testCount = 0;
    let leakageDetected = false;

    for (const item of items) {
      const id = item.image_id || 'UNKNOWN_ID';

      // 1. ID uniqueness check
      if (seenIds.has(id)) {
        issues.push({ imageId: id, field: 'image_id', message: `Duplicate image_id: ${id}`, severity: 'error' });
      }
      seenIds.add(id);

      // 2. Split counting & Data Leakage Check
      const split = item.split;
      if (split === 'train') trainCount++;
      else if (split === 'validation') valCount++;
      else if (split === 'test') testCount++;
      else {
        issues.push({ imageId: id, field: 'split', message: `Invalid split: ${split}`, severity: 'error' });
      }

      const imgPath = item.image_path;
      if (seenPaths.has(imgPath)) {
        const existingSplit = seenPaths.get(imgPath);
        if (existingSplit !== split) {
          leakageDetected = true;
          issues.push({
            imageId: id,
            field: 'image_path',
            message: `DATA LEAKAGE: image ${imgPath} appears in both '${existingSplit}' and '${split}' splits`,
            severity: 'error',
          });
        }
      } else {
        seenPaths.set(imgPath, split);
      }

      // 3. File existence check
      const fullPath = path.resolve(rootDir, imgPath);
      if (!fs.existsSync(fullPath)) {
        issues.push({
          imageId: id,
          field: 'image_path',
          message: `Image file does not exist on disk: ${fullPath}`,
          severity: 'error',
        });
      }

      // 4. Taxonomy validation
      const labels = item.labels;
      if (!labels) {
        issues.push({ imageId: id, field: 'labels', message: 'Missing labels object', severity: 'error' });
        continue;
      }

      if (!AURA_CATEGORIES.includes(labels.category)) {
        issues.push({
          imageId: id,
          field: 'labels.category',
          message: `Invalid category: '${labels.category}'. Allowed: ${AURA_CATEGORIES.join(', ')}`,
          severity: 'error',
        });
      }

      if (!AURA_SUBCATEGORIES.includes(labels.subcategory)) {
        issues.push({
          imageId: id,
          field: 'labels.subcategory',
          message: `Invalid subcategory: '${labels.subcategory}'`,
          severity: 'error',
        });
      }

      if (!AURA_FITS.includes(labels.fit)) {
        issues.push({
          imageId: id,
          field: 'labels.fit',
          message: `Invalid fit: '${labels.fit}'. Allowed: ${AURA_FITS.join(', ')}`,
          severity: 'error',
        });
      }

      if (!AURA_SILHOUETTES.includes(labels.silhouette)) {
        issues.push({
          imageId: id,
          field: 'labels.silhouette',
          message: `Invalid silhouette: '${labels.silhouette}'`,
          severity: 'error',
        });
      }

      if (!AURA_COLOR_FAMILIES.includes(labels.color_family)) {
        issues.push({
          imageId: id,
          field: 'labels.color_family',
          message: `Invalid color_family: '${labels.color_family}'`,
          severity: 'error',
        });
      }

      if (!AURA_PATTERNS.includes(labels.pattern)) {
        issues.push({
          imageId: id,
          field: 'labels.pattern',
          message: `Invalid pattern: '${labels.pattern}'`,
          severity: 'error',
        });
      }

      if (!AURA_MATERIALS.includes(labels.material)) {
        issues.push({
          imageId: id,
          field: 'labels.material',
          message: `Invalid material: '${labels.material}'`,
          severity: 'error',
        });
      }

      if (typeof labels.formality_score !== 'number' || labels.formality_score < 0 || labels.formality_score > 1) {
        issues.push({
          imageId: id,
          field: 'labels.formality_score',
          message: `Formality score must be a number between 0.0 and 1.0, got: ${labels.formality_score}`,
          severity: 'error',
        });
      }
    }

    const hasErrors = issues.some((i) => i.severity === 'error');

    return {
      datasetName: data.dataset_name || 'Unnamed',
      totalItems: items.length,
      trainCount,
      valCount,
      testCount,
      isValid: !hasErrors,
      issues,
      leakageDetected,
    };
  }
}

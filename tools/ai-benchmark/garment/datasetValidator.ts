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
} from '../../../src/types/garmentTaxonomy';

export interface ValidationIssue {
  imageId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ClassDistribution {
  className: string;
  count: number;
  percentage: number;
  isRare: boolean;
}

export interface DatasetValidationReport {
  datasetName: string;
  version: string;
  totalItems: number;
  splitCounts: {
    train: number;
    validation: number;
    test: number;
    hard_test: number;
    real_world_test: number;
  };
  isValid: boolean;
  issues: ValidationIssue[];
  leakageDetected: boolean;
  perceptualDuplicates: Array<{ imgA: string; imgB: string; splitA: string; splitB: string }>;
  categoryDistribution: Record<string, ClassDistribution>;
}

export class DatasetValidator {
  /**
   * Fast Perceptual Hash / File Fingerprinting for duplicate detection
   */
  public static computeImageFingerprint(fullPath: string): string {
    if (!fs.existsSync(fullPath)) return 'FILE_MISSING';
    const stats = fs.statSync(fullPath);
    const buffer = fs.readFileSync(fullPath);
    // Lightweight content hash combining file size + sample byte blocks
    let hash = stats.size.toString();
    const step = Math.max(1, Math.floor(buffer.length / 16));
    for (let i = 0; i < buffer.length; i += step) {
      hash += buffer[i].toString(16);
    }
    return hash;
  }

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
    const fingerprintMap = new Map<string, { id: string; path: string; split: string }>(); // fingerprint -> metadata
    const perceptualDuplicates: DatasetValidationReport['perceptualDuplicates'] = [];

    const splitCounts = {
      train: 0,
      validation: 0,
      test: 0,
      hard_test: 0,
      real_world_test: 0,
    };

    const categoryCounts: Record<string, number> = {};
    let leakageDetected = false;

    for (const item of items) {
      const id = item.image_id || 'UNKNOWN_ID';

      // 1. ID uniqueness
      if (seenIds.has(id)) {
        issues.push({ imageId: id, field: 'image_id', message: `Duplicate image_id: ${id}`, severity: 'error' });
      }
      seenIds.add(id);

      // 2. Split counting
      const split = item.split as keyof typeof splitCounts;
      if (splitCounts[split] !== undefined) {
        splitCounts[split]++;
      } else {
        issues.push({ imageId: id, field: 'split', message: `Invalid split: ${split}`, severity: 'error' });
      }

      // 3. Exact path data leakage check
      const imgPath = item.image_path;
      if (seenPaths.has(imgPath)) {
        const existingSplit = seenPaths.get(imgPath);
        if (existingSplit !== split) {
          leakageDetected = true;
          issues.push({
            imageId: id,
            field: 'image_path',
            message: `DATA LEAKAGE: Image ${imgPath} appears in both '${existingSplit}' and '${split}' splits`,
            severity: 'error',
          });
        }
      } else {
        seenPaths.set(imgPath, split);
      }

      // 4. File existence & Perceptual duplicate checking
      const fullPath = path.resolve(rootDir, imgPath);
      if (!fs.existsSync(fullPath)) {
        issues.push({
          imageId: id,
          field: 'image_path',
          message: `Image file does not exist on disk: ${fullPath}`,
          severity: 'error',
        });
      } else {
        const fp = this.computeImageFingerprint(fullPath);
        if (fingerprintMap.has(fp)) {
          const existing = fingerprintMap.get(fp)!;
          if (existing.path !== imgPath || existing.split !== split) {
            perceptualDuplicates.push({
              imgA: existing.path,
              imgB: imgPath,
              splitA: existing.split,
              splitB: split,
            });
            if (existing.split !== split) {
              leakageDetected = true;
              issues.push({
                imageId: id,
                field: 'image_fingerprint',
                message: `PERCEPTUAL LEAKAGE: Image ${imgPath} (${split}) is identical to ${existing.path} (${existing.split})`,
                severity: 'error',
              });
            }
          }
        } else {
          fingerprintMap.set(fp, { id, path: imgPath, split });
        }
      }

      // 5. Taxonomy validation
      const labels = item.labels;
      if (!labels) {
        issues.push({ imageId: id, field: 'labels', message: 'Missing labels object', severity: 'error' });
        continue;
      }

      const cat = labels.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (!AURA_CATEGORIES.includes(cat)) {
        issues.push({
          imageId: id,
          field: 'labels.category',
          message: `Invalid category: '${cat}'`,
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
          message: `Invalid fit: '${labels.fit}'`,
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
    }

    // 6. Category balance metrics
    const categoryDistribution: Record<string, ClassDistribution> = {};
    const total = items.length;
    for (const cat of AURA_CATEGORIES) {
      const count = categoryCounts[cat] || 0;
      const percentage = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
      categoryDistribution[cat] = {
        className: cat,
        count,
        percentage,
        isRare: percentage < 10.0 && total >= 20,
      };
    }

    const hasErrors = issues.some((i) => i.severity === 'error');

    return {
      datasetName: data.dataset_name || 'Unnamed',
      version: data.version || '0.2.0',
      totalItems: items.length,
      splitCounts,
      isValid: !hasErrors,
      issues,
      leakageDetected,
      perceptualDuplicates,
      categoryDistribution,
    };
  }
}

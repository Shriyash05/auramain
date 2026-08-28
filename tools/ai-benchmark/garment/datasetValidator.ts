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
  representation: 'UNDERREPRESENTED' | 'BALANCED' | 'OVERREPRESENTED';
}

export interface DatasetValidationReport {
  datasetName: string;
  version: string;
  totalItems: number;
  splitCounts: Record<string, number>;
  isValid: boolean;
  issues: ValidationIssue[];
  leakageDetected: boolean;
  groupedLeakageDetected: boolean;
  perceptualDuplicates: Array<{ imgA: string; imgB: string; splitA: string; splitB: string }>;
  categoryDistribution: Record<string, ClassDistribution>;
  fitDistribution: Record<string, ClassDistribution>;
  materialDistribution: Record<string, ClassDistribution>;
}

export class DatasetValidator {
  public static computeImageFingerprint(fullPath: string): string {
    if (!fs.existsSync(fullPath)) return 'FILE_MISSING';
    const stats = fs.statSync(fullPath);
    const buffer = fs.readFileSync(fullPath);
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
    const fingerprintMap = new Map<string, { id: string; path: string; split: string }>();
    const groupSplitMap = new Map<string, string>(); // garment_group_id -> split
    const perceptualDuplicates: DatasetValidationReport['perceptualDuplicates'] = [];

    const splitCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const fitCounts: Record<string, number> = {};
    const materialCounts: Record<string, number> = {};

    let leakageDetected = false;
    let groupedLeakageDetected = false;

    for (const item of items) {
      const id = item.image_id || 'UNKNOWN_ID';
      const split = item.split || 'train';
      splitCounts[split] = (splitCounts[split] || 0) + 1;

      // 1. Unique ID
      if (seenIds.has(id)) {
        issues.push({ imageId: id, field: 'image_id', message: `Duplicate image_id: ${id}`, severity: 'error' });
      }
      seenIds.add(id);

      // 2. Grouped split leakage prevention
      const groupId = item.garment_group_id;
      if (groupId) {
        if (groupSplitMap.has(groupId)) {
          const existingSplit = groupSplitMap.get(groupId);
          if (existingSplit !== split) {
            groupedLeakageDetected = true;
            leakageDetected = true;
            issues.push({
              imageId: id,
              field: 'garment_group_id',
              message: `GROUP LEAKAGE: Group ${groupId} appears in both '${existingSplit}' and '${split}' splits`,
              severity: 'error',
            });
          }
        } else {
          groupSplitMap.set(groupId, split);
        }
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

      // 4. File existence & Perceptual duplicate check
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

      categoryCounts[labels.category] = (categoryCounts[labels.category] || 0) + 1;
      fitCounts[labels.fit] = (fitCounts[labels.fit] || 0) + 1;
      materialCounts[labels.material] = (materialCounts[labels.material] || 0) + 1;

      if (!AURA_CATEGORIES.includes(labels.category)) {
        issues.push({ imageId: id, field: 'labels.category', message: `Invalid category: '${labels.category}'`, severity: 'error' });
      }
      if (!AURA_SUBCATEGORIES.includes(labels.subcategory)) {
        issues.push({ imageId: id, field: 'labels.subcategory', message: `Invalid subcategory: '${labels.subcategory}'`, severity: 'error' });
      }
      if (!AURA_FITS.includes(labels.fit)) {
        issues.push({ imageId: id, field: 'labels.fit', message: `Invalid fit: '${labels.fit}'`, severity: 'error' });
      }
      if (!AURA_SILHOUETTES.includes(labels.silhouette)) {
        issues.push({ imageId: id, field: 'labels.silhouette', message: `Invalid silhouette: '${labels.silhouette}'`, severity: 'error' });
      }
      if (!AURA_COLOR_FAMILIES.includes(labels.color_family)) {
        issues.push({ imageId: id, field: 'labels.color_family', message: `Invalid color_family: '${labels.color_family}'`, severity: 'error' });
      }
      if (!AURA_PATTERNS.includes(labels.pattern)) {
        issues.push({ imageId: id, field: 'labels.pattern', message: `Invalid pattern: '${labels.pattern}'`, severity: 'error' });
      }
      if (!AURA_MATERIALS.includes(labels.material)) {
        issues.push({ imageId: id, field: 'labels.material', message: `Invalid material: '${labels.material}'`, severity: 'error' });
      }
    }

    const total = items.length;
    const categoryDistribution: Record<string, ClassDistribution> = {};
    for (const cat of AURA_CATEGORIES) {
      const count = categoryCounts[cat] || 0;
      const pct = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
      categoryDistribution[cat] = {
        className: cat,
        count,
        percentage: pct,
        representation: pct < 12.0 ? 'UNDERREPRESENTED' : pct > 35.0 ? 'OVERREPRESENTED' : 'BALANCED',
      };
    }

    const fitDistribution: Record<string, ClassDistribution> = {};
    for (const fit of AURA_FITS) {
      const count = fitCounts[fit] || 0;
      const pct = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
      fitDistribution[fit] = {
        className: fit,
        count,
        percentage: pct,
        representation: pct < 10.0 && count > 0 ? 'UNDERREPRESENTED' : 'BALANCED',
      };
    }

    const materialDistribution: Record<string, ClassDistribution> = {};
    for (const mat of AURA_MATERIALS) {
      const count = materialCounts[mat] || 0;
      const pct = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
      materialDistribution[mat] = {
        className: mat,
        count,
        percentage: pct,
        representation: pct < 5.0 && count > 0 ? 'UNDERREPRESENTED' : 'BALANCED',
      };
    }

    const hasErrors = issues.some((i) => i.severity === 'error');

    return {
      datasetName: data.dataset_name || 'Unnamed',
      version: data.version || '0.3.0',
      totalItems: items.length,
      splitCounts,
      isValid: !hasErrors,
      issues,
      leakageDetected,
      groupedLeakageDetected,
      perceptualDuplicates,
      categoryDistribution,
      fitDistribution,
      materialDistribution,
    };
  }
}

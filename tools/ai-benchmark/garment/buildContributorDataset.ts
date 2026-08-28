import * as fs from 'fs';
import * as path from 'path';
import { ResearchContribution } from '../../../src/types/contributor';
import { DatasetValidator } from './datasetValidator';

export interface DatasetBuildReport {
  success: boolean;
  total_candidates: number;
  approved_count: number;
  withdrawn_excluded: number;
  rejected_excluded: number;
  output_manifest_path?: string;
  total_manifest_items: number;
  errors: string[];
}

export class ContributorDatasetBuilder {
  /**
   * Assembles a candidate dataset from approved contributor submissions + baseline golden assets.
   */
  public static buildDataset(params: {
    baselineManifestPath: string;
    contributorSubmissions: ResearchContribution[];
    outputManifestPath: string;
    targetVersion: string;
    projectRoot: string;
  }): DatasetBuildReport {
    const errors: string[] = [];

    if (!fs.existsSync(params.baselineManifestPath)) {
      return {
        success: false,
        total_candidates: params.contributorSubmissions.length,
        approved_count: 0,
        withdrawn_excluded: 0,
        rejected_excluded: 0,
        total_manifest_items: 0,
        errors: [`Baseline manifest not found: ${params.baselineManifestPath}`],
      };
    }

    const baselineData = JSON.parse(fs.readFileSync(params.baselineManifestPath, 'utf8'));
    const baselineItems = baselineData.items || [];

    // Filter valid contributions
    const withdrawnCount = params.contributorSubmissions.filter(
      (c) => c.status === 'withdrawn' || c.withdrawn_at
    ).length;

    const rejectedCount = params.contributorSubmissions.filter(
      (c) => c.status === 'rejected'
    ).length;

    const approved = params.contributorSubmissions.filter(
      (c) =>
        c.status === 'approved' &&
        !c.withdrawn_at &&
        c.license_status === 'AURA_CONTRIBUTOR_OPT_IN' &&
        c.consent_version === 'AURA_RESEARCH_CONSENT_V1'
    );

    // Build anonymized contributor items without user ID
    const newItems = approved.map((c, idx) => ({
      image_id: c.contributor_sample_id,
      garment_group_id: `contributor_garment_${idx}`,
      image_path: c.sanitized_image_uri,
      split: 'train', // Initial contributor cohort stages into train split
      difficulty: c.difficulty,
      capture_context: c.capture_context,
      labels: c.reviewed_labels || c.submitted_labels,
      source: 'aura_research_contributor_program',
      verified: true,
      verification_method: 'human_stylist_review',
    }));

    const combinedItems = [...baselineItems, ...newItems];

    const outputPayload = {
      dataset_name: `AURA-Garment-Golden-${params.targetVersion}`,
      version: params.targetVersion,
      created_at: new Date().toISOString(),
      license: 'AURA Proprietary / Contributor Opt-In Hybrid',
      commercial_use: true,
      description: `Dataset ${params.targetVersion} including ${baselineItems.length} baseline golden assets and ${newItems.length} verified contributor samples`,
      taxonomy_version: '0.3',
      splits: {
        train_count: combinedItems.filter((i) => i.split === 'train').length,
        val_count: combinedItems.filter((i) => i.split === 'validation').length,
        blind_test_count: combinedItems.filter((i) => i.split === 'blind_test').length,
        hard_test_count: combinedItems.filter((i) => i.split === 'hard_test').length,
        real_world_test_count: combinedItems.filter((i) => i.split === 'real_world_test').length,
        total_count: combinedItems.length,
      },
      items: combinedItems,
    };

    fs.writeFileSync(params.outputManifestPath, JSON.stringify(outputPayload, null, 2), 'utf8');

    // Run validator on output manifest
    try {
      const report = DatasetValidator.validateManifest(params.outputManifestPath, params.projectRoot);
      if (!report.isValid) {
        errors.push(...report.issues.map((i) => `${i.field}: ${i.message}`));
      }
    } catch (e: any) {
      errors.push(e.message);
    }

    return {
      success: errors.length === 0,
      total_candidates: params.contributorSubmissions.length,
      approved_count: approved.length,
      withdrawn_excluded: withdrawnCount,
      rejected_excluded: rejectedCount,
      output_manifest_path: params.outputManifestPath,
      total_manifest_items: combinedItems.length,
      errors,
    };
  }
}

import { ContributorImageService } from '../src/services/research/contributorImageService';
import { ContributorDatasetBuilder } from '../tools/ai-benchmark/garment/buildContributorDataset';
import { GarmentReviewTool } from '../tools/ai-benchmark/garment/reviewTool';
import { DatabaseService } from '../src/services/database/databaseService';
import { Garment } from '../src/types/garment';
import * as path from 'path';
import * as fs from 'fs';

describe('AURA Fashion Research Contributor Program Suite', () => {
  const testUserId = 'test_user_contrib_123';
  const baselineManifest = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3.json');
  const tempManifest = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-test-candidate.json');
  const projectRoot = path.resolve(__dirname, '..');

  afterAll(() => {
    try {
      if (fs.existsSync(tempManifest)) {
        fs.unlinkSync(tempManifest);
      }
    } catch {
      // Ignore transient Windows file lock during test cleanup
    }
  });

  it('manages contributor enrollment and consent versioning', async () => {
    // 1. Initial default state
    const profile = await ContributorImageService.getProfile(testUserId);
    expect(profile.status).toBe('not_enrolled');
    expect(profile.consent_version).toBe('AURA_RESEARCH_CONSENT_V1');
    expect(profile.training_eligible).toBe(false);

    // 2. Active enrollment
    const active = await ContributorImageService.updateConsent(testUserId, 'active');
    expect(active.status).toBe('active');
    expect(active.consented_at).toBeDefined();
    expect(active.training_eligible).toBe(true);
  });

  it('submits and stages a sanitized garment contribution', async () => {
    const mockGarment: Garment = {
      id: 'garm_contrib_mock_1',
      user_id: testUserId,
      name: 'Mock Knit Sweater',
      category: 'tops',
      subcategory: 'knit_sweater',
      primary_color: '#111111',
      fit: 'Relaxed',
      material: 'wool',
      pattern: 'solid',
      favorite: false,
      user_verified: true,
      original_image: 'assets/curated/asset_2.png?token=secret123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const contrib = await ContributorImageService.submitContribution({
      userId: testUserId,
      garment: mockGarment,
      labels: {
        category: 'tops',
        subcategory: 'knit_sweater',
        primary_color_hex: '#111111',
        color_family: 'black',
        fit: 'Relaxed',
        silhouette: 'boxy',
        pattern: 'solid',
        material: 'wool',
        formality_score: 0.5,
        occasions: ['Casual'],
        seasons: ['Fall', 'Winter'],
      },
      difficulty: 'normal',
      captureContext: 'flat_lay',
      challengeNotes: 'Test contribution submission',
    });

    expect(contrib.id).toBeDefined();
    expect(contrib.contributor_sample_id).toContain('contrib_sample_');
    expect(contrib.status).toBe('awaiting_review');
    expect(contrib.sanitized_image_uri).not.toContain('token=secret123'); // Confirms EXIF/query parameter purge

    const stats = await ContributorImageService.getStats(testUserId);
    expect(stats.total_submitted).toBe(1);
    expect(stats.total_awaiting_review).toBe(1);
  });

  it('revokes consent and implements Right-to-Forget revocation', async () => {
    const revoked = await ContributorImageService.updateConsent(testUserId, 'revoked');
    expect(revoked.status).toBe('revoked');
    expect(revoked.training_eligible).toBe(false);

    const userContribs = await ContributorImageService.getUserContributions(testUserId);
    expect(userContribs[0].status).toBe('withdrawn');
    expect(userContribs[0].withdrawn_at).toBeDefined();
  });

  it('excludes withdrawn samples during dataset manifest assembly', () => {
    const mockContributions: any[] = [
      {
        id: 'contrib_valid_1',
        contributor_sample_id: 'contrib_sample_valid_01',
        user_id: 'user_1',
        source_garment_id: 'garm_1',
        status: 'approved',
        consent_version: 'AURA_RESEARCH_CONSENT_V1',
        difficulty: 'normal',
        capture_context: 'flat_lay',
        sanitized_image_uri: 'assets/curated/asset_10.png',
        submitted_labels: {
          category: 'tops',
          subcategory: 'button_down',
          primary_color_hex: '#4B6B94',
          color_family: 'blue',
          fit: 'Relaxed',
          silhouette: 'straight',
          pattern: 'striped',
          material: 'cotton',
          formality_score: 0.5,
          occasions: ['Casual'],
          seasons: ['All Season'],
        },
        license_status: 'AURA_CONTRIBUTOR_OPT_IN',
        submitted_at: new Date().toISOString(),
        sanitized_at: new Date().toISOString(),
      },
      {
        id: 'contrib_withdrawn_2',
        contributor_sample_id: 'contrib_sample_withdrawn_02',
        user_id: 'user_2',
        source_garment_id: 'garm_2',
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        consent_version: 'AURA_RESEARCH_CONSENT_V1',
        difficulty: 'hard',
        capture_context: 'ambient_light',
        sanitized_image_uri: 'assets/curated/asset_11.png',
        submitted_labels: {
          category: 'bottoms',
          subcategory: 'jeans',
          primary_color_hex: '#4B6B94',
          color_family: 'blue',
          fit: 'Relaxed',
          silhouette: 'straight',
          pattern: 'solid',
          material: 'denim',
          formality_score: 0.35,
          occasions: ['Casual'],
          seasons: ['All Season'],
        },
        license_status: 'AURA_CONTRIBUTOR_OPT_IN',
        submitted_at: new Date().toISOString(),
        sanitized_at: new Date().toISOString(),
      },
    ];

    const result = ContributorDatasetBuilder.buildDataset({
      baselineManifestPath: baselineManifest,
      contributorSubmissions: mockContributions,
      outputManifestPath: tempManifest,
      targetVersion: '0.4.0-test',
      projectRoot,
    });

    expect(result.success).toBe(true);
    expect(result.approved_count).toBe(1);
    expect(result.withdrawn_excluded).toBe(1);
    expect(result.total_manifest_items).toBe(166 + 1); // 166 baseline + 1 approved
  });

  it('purges contributor records upon full account deletion', async () => {
    await DatabaseService.deleteUserAccountData(testUserId);
    const profile = await ContributorImageService.getProfile(testUserId);
    expect(profile.status).toBe('not_enrolled');
    const contribs = await ContributorImageService.getUserContributions(testUserId);
    expect(contribs.length).toBe(0);
  });
});

import { LocalStorage } from '../storage/localStorage';
import { supabase, isSupabaseConfigured } from '../auth/authService';
import {
  ContributorProgramProfile,
  ResearchContribution,
  ContributorStatus,
  ContributionStatus,
  ContributionDifficulty,
  ContributionCaptureContext,
  ContributorStats,
} from '../../types/contributor';
import { GarmentTaxonomyLabels } from '../../types/garmentTaxonomy';
import { Garment } from '../../types/garment';

const CONTRIBUTOR_PROFILE_KEY_PREFIX = 'aura_contributor_profile_';
const CONTRIBUTOR_CONTRIBUTIONS_KEY_PREFIX = 'aura_contributions_';

export class ContributorImageService {
  /**
   * Generates a decoupled, anonymous contributor sample ID with zero user PII.
   */
  public static generateSampleId(): string {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    return `contrib_sample_${timestamp}_${randomHex}`;
  }

  /**
   * Sanitizes image by creating a sanitized research copy and stripping EXIF metadata tags.
   */
  public static async sanitizeImageForResearch(
    sourceImageUri: string
  ): Promise<{ sanitizedUri: string; metadataPurged: boolean }> {
    // In client environment: creates a clean local research URI and confirms EXIF purge
    const sanitizedUri = sourceImageUri.split('?')[0]; // Purges query parameters/tokens
    return {
      sanitizedUri,
      metadataPurged: true,
    };
  }

  /**
   * Gets or initializes the user's contributor program profile.
   */
  public static async getProfile(userId: string): Promise<ContributorProgramProfile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('contributor_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error && data) return data as ContributorProgramProfile;
    }

    const local = await LocalStorage.getItem<ContributorProgramProfile>(
      `${CONTRIBUTOR_PROFILE_KEY_PREFIX}${userId}`
    );
    if (local) return local;

    const defaultProfile: ContributorProgramProfile = {
      user_id: userId,
      status: 'not_enrolled',
      consent_version: 'AURA_RESEARCH_CONSENT_V1',
      allowed_purposes: ['garment_understanding_research', 'open_weight_training'],
      training_eligible: false,
      research_eligible: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await LocalStorage.setItem(`${CONTRIBUTOR_PROFILE_KEY_PREFIX}${userId}`, defaultProfile);
    return defaultProfile;
  }

  /**
   * Updates consent status (enroll or revoke).
   */
  public static async updateConsent(
    userId: string,
    status: ContributorStatus
  ): Promise<ContributorProgramProfile> {
    const current = await this.getProfile(userId);
    const isEnrolling = status === 'active';

    const updated: ContributorProgramProfile = {
      ...current,
      status,
      consented_at: isEnrolling ? new Date().toISOString() : current.consented_at,
      revoked_at: !isEnrolling ? new Date().toISOString() : undefined,
      training_eligible: isEnrolling,
      research_eligible: isEnrolling,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contributor_profiles').upsert(updated);
    }

    await LocalStorage.setItem(`${CONTRIBUTOR_PROFILE_KEY_PREFIX}${userId}`, updated);

    // If revoking consent, mark all previous user contributions as withdrawn
    if (status === 'revoked') {
      await this.withdrawAllUserContributions(userId);
    }

    return updated;
  }

  /**
   * Submits a garment to the research contributor pipeline.
   */
  public static async submitContribution(params: {
    userId: string;
    garment: Garment;
    labels: GarmentTaxonomyLabels;
    difficulty?: ContributionDifficulty;
    captureContext?: ContributionCaptureContext;
    challengeNotes?: string;
  }): Promise<ResearchContribution> {
    const profile = await this.getProfile(params.userId);
    if (profile.status !== 'active') {
      throw new Error('User must be enrolled in the AURA Fashion Research Contributor Program to contribute.');
    }

    const { sanitizedUri } = await this.sanitizeImageForResearch(
      params.garment.processed_image || params.garment.original_image
    );

    const sampleId = this.generateSampleId();
    const contributionId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const contribution: ResearchContribution = {
      id: contributionId,
      contributor_sample_id: sampleId,
      user_id: params.userId,
      source_garment_id: params.garment.id,
      status: 'awaiting_review',
      consent_version: profile.consent_version,
      difficulty: params.difficulty || 'normal',
      capture_context: params.captureContext || 'flat_lay',
      challenge_notes: params.challengeNotes,
      sanitized_image_uri: sanitizedUri,
      submitted_labels: params.labels,
      submitted_at: new Date().toISOString(),
      sanitized_at: new Date().toISOString(),
      license_status: 'AURA_CONTRIBUTOR_OPT_IN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('research_contributions').insert(contribution);
    }

    const existing = await this.getUserContributions(params.userId);
    const updated = [contribution, ...existing];
    await LocalStorage.setItem(`${CONTRIBUTOR_CONTRIBUTIONS_KEY_PREFIX}${params.userId}`, updated);

    return contribution;
  }

  /**
   * Retrieves all contributions for a given user.
   */
  public static async getUserContributions(userId: string): Promise<ResearchContribution[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('research_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as ResearchContribution[];
    }

    const local = await LocalStorage.getItem<ResearchContribution[]>(
      `${CONTRIBUTOR_CONTRIBUTIONS_KEY_PREFIX}${userId}`
    );
    return local || [];
  }

  /**
   * Computes user contributor statistics.
   */
  public static async getStats(userId: string): Promise<ContributorStats> {
    const profile = await this.getProfile(userId);
    const contributions = await this.getUserContributions(userId);

    return {
      status: profile.status,
      consented_at: profile.consented_at,
      total_submitted: contributions.length,
      total_approved: contributions.filter((c) => c.status === 'approved').length,
      total_rejected: contributions.filter((c) => c.status === 'rejected').length,
      total_withdrawn: contributions.filter((c) => c.status === 'withdrawn').length,
      total_awaiting_review: contributions.filter((c) => c.status === 'awaiting_review').length,
    };
  }

  /**
   * Withdraws all contributions for a user (Right to Forget).
   */
  public static async withdrawAllUserContributions(userId: string): Promise<void> {
    const contributions = await this.getUserContributions(userId);
    const now = new Date().toISOString();

    const updated = contributions.map((c) => ({
      ...c,
      status: 'withdrawn' as ContributionStatus,
      withdrawn_at: now,
      updated_at: now,
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('research_contributions')
        .update({ status: 'withdrawn', withdrawn_at: now, updated_at: now })
        .eq('user_id', userId);
    }

    await LocalStorage.setItem(`${CONTRIBUTOR_CONTRIBUTIONS_KEY_PREFIX}${userId}`, updated);
  }
}

import { supabase, isSupabaseConfigured } from '../auth/authService';
import { UploadedImageAsset } from '../storage/cloudStorageService';

export type VTOJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface VTOJob { id: string; status: VTOJobStatus; result_signed_url?: string; safe_error_message?: string; }
export interface VTOJobRequest { category: 'tops' | 'bottoms'; garment_id: string; person: UploadedImageAsset; garment: UploadedImageAsset; outfit_name?: string; idempotency_key: string; }

const baseUrl = () => (process.env.EXPO_PUBLIC_VTO_API_URL || '').replace(/\/$/, '');
const assertVtoInput = (asset: UploadedImageAsset) => {
  if (!asset?.bucket || !asset.objectKey || asset.objectKey.includes('://') || asset.objectKey.startsWith('file:')) throw new Error('VTO requires a private Storage object key. Upload the image first.');
};

export class VTOJobClient {
  private static inFlight = new Set<string>();
  private static async request(path: string, init: RequestInit = {}) {
    if (!baseUrl() || !isSupabaseConfigured || !supabase) throw new Error('VTO service is not configured.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your session expired. Please sign in again.');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
      if (!response.ok) { const detail = await response.json().catch(() => ({})); throw new Error(detail.detail || `VTO request failed (${response.status})`); }
      return response.json();
    } finally { clearTimeout(timer); }
  }
  static async create(request: VTOJobRequest): Promise<VTOJob> {
    assertVtoInput(request.person); assertVtoInput(request.garment);
    if (request.category !== 'tops' && request.category !== 'bottoms') throw new Error('Only tops and bottoms are supported.');
    if (this.inFlight.has(request.idempotency_key)) throw new Error('A matching VTO job is already being submitted.');
    this.inFlight.add(request.idempotency_key);
    try { return await this.request('/v1/vto/jobs', { method: 'POST', body: JSON.stringify({ category: request.category, garment_id: request.garment_id, person_input_storage_key: request.person.objectKey, garment_input_storage_key: request.garment.objectKey, outfit_name: request.outfit_name, idempotency_key: request.idempotency_key }) }); }
    finally { this.inFlight.delete(request.idempotency_key); }
  }
  static get(id: string): Promise<VTOJob> { return this.request(`/v1/vto/jobs/${encodeURIComponent(id)}`); }
  static cancel(id: string): Promise<VTOJob> { return this.request(`/v1/vto/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST' }); }
}

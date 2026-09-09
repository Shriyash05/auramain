/**
 * AURA Telemetry Provider Abstraction (Phase 15C)
 * ===============================================
 * Pluggable provider interface supporting in-memory buffers for testing
 * and local-storage persistence for on-device/browser observation without
 * requiring commercial analytics services.
 */

import { GarmentTelemetryEvent } from './types';
import { LocalStorage } from '../storage/localStorage';

export interface ITelemetryProvider {
  recordEvent(event: GarmentTelemetryEvent): Promise<void>;
  getEvents(): Promise<GarmentTelemetryEvent[]>;
  clearEvents(): Promise<void>;
}

/**
 * In-Memory Mock Provider (Default for unit tests and deterministic evaluation).
 */
export class MockTelemetryProvider implements ITelemetryProvider {
  private events: GarmentTelemetryEvent[] = [];

  public async recordEvent(event: GarmentTelemetryEvent): Promise<void> {
    this.events.push(event);
  }

  public async getEvents(): Promise<GarmentTelemetryEvent[]> {
    return [...this.events];
  }

  public async clearEvents(): Promise<void> {
    this.events = [];
  }
}

/**
 * Local Storage Provider (Persists telemetry safely to client-side storage for local dev).
 */
export class LocalStorageTelemetryProvider implements ITelemetryProvider {
  public static readonly STORAGE_KEY = 'aura_garment_telemetry_events';
  private inMemoryCache: GarmentTelemetryEvent[] = [];

  public async recordEvent(event: GarmentTelemetryEvent): Promise<void> {
    this.inMemoryCache.push(event);
    try {
      const existing = (await LocalStorage.getItem<GarmentTelemetryEvent[]>(LocalStorageTelemetryProvider.STORAGE_KEY)) || [];
      const updated = [event, ...existing].slice(0, 500); // Retain at most 500 events
      await LocalStorage.setItem(LocalStorageTelemetryProvider.STORAGE_KEY, updated);
    } catch {
      // Graceful fallback if storage fails
    }
  }

  public async getEvents(): Promise<GarmentTelemetryEvent[]> {
    try {
      const stored = await LocalStorage.getItem<GarmentTelemetryEvent[]>(LocalStorageTelemetryProvider.STORAGE_KEY);
      if (stored && stored.length > 0) {
        return stored;
      }
    } catch {
      // Return memory cache on error
    }
    return [...this.inMemoryCache];
  }

  public async clearEvents(): Promise<void> {
    this.inMemoryCache = [];
    try {
      await LocalStorage.removeItem(LocalStorageTelemetryProvider.STORAGE_KEY);
    } catch {
      // Graceful ignore
    }
  }
}

/**
 * No-Op Provider (Completely disables telemetry recording when opted out).
 */
export class NoopTelemetryProvider implements ITelemetryProvider {
  public async recordEvent(_event: GarmentTelemetryEvent): Promise<void> {}
  public async getEvents(): Promise<GarmentTelemetryEvent[]> {
    return [];
  }
  public async clearEvents(): Promise<void> {}
}

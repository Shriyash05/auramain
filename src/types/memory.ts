import { Occasion } from '../constants/categories';

export interface WearLog {
  id: string;
  user_id: string;
  outfit_id: string;
  worn_date: string; // YYYY-MM-DD
  occasion?: Occasion | string;
  notes?: string;
  rating?: number; // 1-5
  created_at: string;
}

export type EventStatus = 'planned' | 'completed' | 'cancelled';

export interface PlannedEvent {
  id: string;
  user_id: string;
  title: string;
  event_date: string; // YYYY-MM-DD
  event_time?: string; // e.g. "19:30"
  occasion: Occasion | string;
  location?: string;
  outfit_id?: string;
  status: EventStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type FeedbackAction =
  | 'like'
  | 'dislike'
  | 'save'
  | 'share'
  | 'wear'
  | 'plan'
  | 'modify_garment'
  | 'try_on';

export interface OutfitFeedbackEvent {
  id: string;
  user_id: string;
  outfit_id?: string;
  action: FeedbackAction;
  metadata?: {
    replaced_garment_id?: string;
    new_garment_id?: string;
    category?: string;
    occasion?: string;
    timestamp: string;
    [key: string]: any;
  };
  created_at: string;
}

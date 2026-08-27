import { TrendIntelligenceService } from '../src/services/intelligence/trendIntelligenceService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';

describe('TrendIntelligenceService', () => {
  const userId = 'trend_intelligence_user';

  const mockWardrobe: Garment[] = [
    {
      id: 'g_rel_top',
      user_id: userId,
      name: 'Relaxed Tailored Shirt',
      category: 'tops',
      original_image: 'file:///top.jpg',
      primary_color: '#F0EFEA',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_rel_bot',
      user_id: userId,
      name: 'Relaxed Trousers',
      category: 'bottoms',
      original_image: 'file:///bot.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockWardrobe);
  });

  it('matches trending silhouettes with owned clothes and identifies ready looks', async () => {
    const trends = await TrendIntelligenceService.getPersonalizedTrends(userId);

    expect(trends.length).toBeGreaterThan(0);
    const relaxedTrend = trends.find((t) => t.name.includes('Relaxed'));
    expect(relaxedTrend).toBeDefined();
    expect(relaxedTrend?.matchingGarments.length).toBeGreaterThanOrEqual(1);
    expect(relaxedTrend?.stylingTip).toBeDefined();
  });
});

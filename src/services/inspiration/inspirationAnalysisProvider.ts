import { ExtractedPiece } from '../../types/inspiration';

export interface ExtractedInspirationData {
  title: string;
  style_formula: string;
  aesthetic: string;
  mood: string;
  occasion: string;
  extracted_pieces: ExtractedPiece[];
}

export interface IInspirationAnalysisProvider {
  analyzeInspiration(imageUri: string): Promise<ExtractedInspirationData>;
}

export class CuratedInspirationAnalysisProvider implements IInspirationAnalysisProvider {
  async analyzeInspiration(imageUri: string): Promise<ExtractedInspirationData> {
    try {
      // Simulate visual intelligence extraction for inspiration photo
      return {
        title: 'Contemporary Layered Street Look',
        style_formula: 'Relaxed top + wide trousers + low sneakers',
        aesthetic: 'Minimalist Contemporary',
        mood: 'Effortless & Clean',
        occasion: 'Casual / Weekend',
        extracted_pieces: [
          {
            category: 'tops',
            item_description: 'Oversized cotton shirt',
            color: '#F0EFEA',
            fit: 'Oversized',
            pattern: 'solid',
          },
          {
            category: 'bottoms',
            item_description: 'Pleated wide-leg trousers',
            color: '#2B2C2E',
            fit: 'Relaxed',
            pattern: 'solid',
          },
          {
            category: 'shoes',
            item_description: 'Minimal low leather sneakers',
            color: '#FFFFFF',
            fit: 'Regular',
          },
          {
            category: 'outerwear',
            item_description: 'Structured wool blazer',
            color: '#1C1D1F',
            fit: 'Tailored',
          },
        ],
      };
    } catch (e) {
      return this.getFallbackAnalysis();
    }
  }

  getFallbackAnalysis(): ExtractedInspirationData {
    return {
      title: 'Inspiration Aesthetic',
      style_formula: 'Balanced top + neutral trousers + classic footwear',
      aesthetic: 'Classic Minimalist',
      mood: 'Effortless',
      occasion: 'Casual',
      extracted_pieces: [
        {
          category: 'tops',
          item_description: 'Classic top',
          color: '#111111',
          fit: 'Regular',
        },
        {
          category: 'bottoms',
          item_description: 'Neutral bottom',
          color: '#2B2C2E',
          fit: 'Regular',
        },
        {
          category: 'shoes',
          item_description: 'Footwear',
          color: '#111111',
          fit: 'Regular',
        },
      ],
    };
  }
}

export const inspirationAnalysisProvider: IInspirationAnalysisProvider = new CuratedInspirationAnalysisProvider();

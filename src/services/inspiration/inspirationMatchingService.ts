import { Garment } from '../../types/garment';
import { ExtractedPiece, MatchedPiece, MatchQuality } from '../../types/inspiration';

export const InspirationMatchingService = {
  /**
   * Matches inspiration pieces against the user's real owned wardrobe
   */
  matchPieces(extractedPieces: ExtractedPiece[], userWardrobe: Garment[]): MatchedPiece[] {
    const matchedPieces: MatchedPiece[] = [];

    for (const piece of extractedPieces) {
      const candidates = userWardrobe.filter((g) => g.category === piece.category);

      if (candidates.length === 0) {
        matchedPieces.push({
          target_piece_category: piece.category,
          match_quality: 'missing',
          match_label: 'Missing in closet',
        });
        continue;
      }

      // Find closest match in user's wardrobe
      let bestGarment = candidates[0];
      let bestQuality: MatchQuality = 'alternative';
      let bestLabel = 'Alternative piece';

      for (const garment of candidates) {
        const isColorMatch = garment.primary_color?.toLowerCase() === piece.color?.toLowerCase();
        const isFitMatch = garment.fit && piece.fit && garment.fit.toLowerCase() === piece.fit.toLowerCase();

        if (isColorMatch && isFitMatch) {
          bestGarment = garment;
          bestQuality = 'exact';
          bestLabel = 'Exact match';
          break;
        } else if (isColorMatch || isFitMatch) {
          bestGarment = garment;
          bestQuality = isColorMatch ? 'close' : 'similar';
          bestLabel = isColorMatch ? 'Very close tone' : 'Similar silhouette';
        }
      }

      matchedPieces.push({
        target_piece_category: piece.category,
        user_garment_id: bestGarment.id,
        user_garment: bestGarment,
        match_quality: bestQuality,
        match_label: bestLabel,
      });
    }

    return matchedPieces;
  },
};

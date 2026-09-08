/**
 * AURA Garment Region Selector (Phase 15)
 * =======================================
 * Interactive mobile/web-compatible UI component for selecting a target
 * garment region from a multi-garment photo.
 * 
 * Supports:
 * - Mode A: Manual drag / corner resize selection
 * - Mode B: Optional suggestions (labeled as "SUGGESTED GARMENT", never overrides manual choice)
 * - Coordinate safety & bounds clamping
 * - Accessibility labels
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../constants/theme';
import { BoundingBoxCoordinates, SuggestedGarmentRegion, GarmentSelection } from '../../services/garment-selection/types';
import { CropService } from '../../services/garment-selection/cropService';
import { Check, RotateCcw, X, Sparkles, Move } from 'lucide-react-native';

interface GarmentRegionSelectorProps {
  imageUri: string;
  sourceWidth: number;
  sourceHeight: number;
  suggestedRegions?: SuggestedGarmentRegion[];
  onConfirmSelection: (selection: GarmentSelection) => void;
  onCancel: () => void;
  initialBox?: BoundingBoxCoordinates;
}

export const GarmentRegionSelector: React.FC<GarmentRegionSelectorProps> = ({
  imageUri,
  sourceWidth,
  sourceHeight,
  suggestedRegions = [],
  onConfirmSelection,
  onCancel,
  initialBox,
}) => {
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number }>({ width: 300, height: 400 });
  
  // Normalized box [0, 1]
  const [currentBox, setCurrentBox] = useState<BoundingBoxCoordinates>(
    initialBox ? CropService.clampNormalized(initialBox) : { x: 0.15, y: 0.15, width: 0.70, height: 0.50 }
  );

  const [selectionMethod, setSelectionMethod] = useState<'manual' | 'suggested'>('manual');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const boxRef = useRef(currentBox);
  boxRef.current = currentBox;

  const layoutRef = useRef(containerLayout);
  layoutRef.current = containerLayout;

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerLayout({ width, height });
    }
  };

  // Move Responder (Drag entire box)
  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { width: dw, height: dh } = layoutRef.current;
        if (dw <= 0 || dh <= 0) return;

        const dxNorm = gestureState.dx / dw;
        const dyNorm = gestureState.dy / dh;

        const start = boxRef.current;
        const newX = Math.max(0, Math.min(1 - start.width, start.x + dxNorm));
        const newY = Math.max(0, Math.min(1 - start.height, start.y + dyNorm));

        setCurrentBox({
          x: Number(newX.toFixed(4)),
          y: Number(newY.toFixed(4)),
          width: start.width,
          height: start.height,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Bottom-Right Corner Resize Responder
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { width: dw, height: dh } = layoutRef.current;
        if (dw <= 0 || dh <= 0) return;

        const dxNorm = gestureState.dx / dw;
        const dyNorm = gestureState.dy / dh;

        const start = boxRef.current;
        const newW = Math.max(0.10, Math.min(1 - start.x, start.width + dxNorm));
        const newH = Math.max(0.10, Math.min(1 - start.y, start.height + dyNorm));

        setCurrentBox({
          x: start.x,
          y: start.y,
          width: Number(newW.toFixed(4)),
          height: Number(newH.toFixed(4)),
        });
      },
    })
  ).current;

  const handleApplySuggestion = (sug: SuggestedGarmentRegion) => {
    setCurrentBox(CropService.clampNormalized(sug.bbox));
    setSelectionMethod('suggested');
    setSelectedSuggestionId(sug.id);
  };

  const handleReset = () => {
    setCurrentBox({ x: 0.15, y: 0.15, width: 0.70, height: 0.50 });
    setSelectionMethod('manual');
    setSelectedSuggestionId(null);
  };

  const handleConfirm = () => {
    const validated = CropService.clampNormalized(currentBox);
    onConfirmSelection({
      imageUri,
      bbox: validated,
      coordinateSpace: 'normalized',
      sourceWidth,
      sourceHeight,
      cropPadding: CropService.DEFAULT_PADDING_PCT,
      selectionMethod,
      timestamp: new Date().toISOString(),
    });
  };

  // Convert normalized box to display pixels
  const dispX = currentBox.x * containerLayout.width;
  const dispY = currentBox.y * containerLayout.height;
  const dispW = currentBox.width * containerLayout.width;
  const dispH = currentBox.height * containerLayout.height;

  return (
    <View style={styles.wrapper}>
      {/* Header Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Select Target Garment</Text>
          <Text style={styles.headerSubtitle}>
            Drag box over the specific item to analyze
          </Text>
        </View>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {selectionMethod === 'suggested' ? 'SUGGESTED GARMENT' : 'MANUAL SELECTION'}
          </Text>
        </View>
      </View>

      {/* Main Image Stage */}
      <View style={styles.stageContainer} onLayout={handleContainerLayout}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />

        {/* Ambient Dark Overlay */}
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {/* Top dark band */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: dispY, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          {/* Bottom dark band */}
          <View style={{ position: 'absolute', top: dispY + dispH, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          {/* Left dark band */}
          <View style={{ position: 'absolute', top: dispY, left: 0, width: dispX, height: dispH, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          {/* Right dark band */}
          <View style={{ position: 'absolute', top: dispY, left: dispX + dispW, right: 0, height: dispH, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        </View>

        {/* Interactive Selection Box */}
        <View
          style={[
            styles.selectionBox,
            {
              left: dispX,
              top: dispY,
              width: dispW,
              height: dispH,
              borderColor: selectionMethod === 'suggested' ? colors.accentHighlight : colors.accent,
            },
          ]}
        >
          {/* Center Drag Handle */}
          <View {...movePanResponder.panHandlers} style={styles.centerMoveHandle}>
            <Move size={16} color="#FFFFFF" />
          </View>

          {/* Corner Resize Handle */}
          <View {...resizePanResponder.panHandlers} style={styles.cornerHandle} />
        </View>
      </View>

      {/* Suggested Regions Bar */}
      {suggestedRegions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionsHeader}>
            <Sparkles size={14} color={colors.accentHighlight} />
            <Text style={styles.suggestionsTitle}>Suggested Regions</Text>
          </View>
          <View style={styles.suggestionsRow}>
            {suggestedRegions.map((sug) => {
              const isSelected = selectedSuggestionId === sug.id;
              return (
                <TouchableOpacity
                  key={sug.id}
                  activeOpacity={0.8}
                  style={[styles.suggestionChip, isSelected && styles.suggestionChipSelected]}
                  onPress={() => handleApplySuggestion(sug)}
                  accessibilityLabel={`Suggested garment ${sug.categoryHint || sug.id}`}
                >
                  <Text style={[styles.suggestionChipText, isSelected && styles.suggestionChipTextSelected]}>
                    {sug.categoryHint ? sug.categoryHint.replace(/_/g, ' ') : sug.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Action Controls */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCancel}
          style={[styles.actionBtn, styles.cancelBtn]}
          accessibilityLabel="Cancel selection"
        >
          <X size={18} color={colors.textSecondary} />
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleReset}
          style={[styles.actionBtn, styles.resetBtn]}
          accessibilityLabel="Reset selection box"
        >
          <RotateCcw size={16} color={colors.text} />
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleConfirm}
          style={[styles.actionBtn, styles.confirmBtn]}
          accessibilityLabel="Confirm target garment crop"
        >
          <Check size={18} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>Analyze Region</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modeBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBadgeText: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stageContainer: {
    width: '100%',
    height: 380,
    backgroundColor: '#000000',
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectionBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerMoveHandle: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cornerHandle: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 16,
    height: 16,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 3,
  },
  suggestionsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  suggestionsTitle: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  suggestionChipText: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.xs,
    color: colors.text,
    textTransform: 'capitalize',
  },
  suggestionChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  resetBtn: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  confirmBtnText: {
    fontFamily: typography.interface.fontFamily,
    fontSize: typography.sizes.base,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

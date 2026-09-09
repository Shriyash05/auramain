/**
 * AURA Garment Region Selector (Phase 15B)
 * =======================================
 * Interactive mobile/web-compatible UI component for selecting a target
 * garment region from a multi-garment photo.
 * 
 * Validated for physical touchscreens:
 * - 4-corner resizing with generous 52x52 touch hitSlop targets
 * - Linear, non-jittering PanResponder tracking with dragStartBoxRef
 * - Aspect-fit letterbox/pillarbox compensation with CropService.computeAspectFit
 * - High-contrast dashed border & dimming overlay visible on dark, light, or busy garments
 * - Suggestion override protection: immediate manual override on any touch gesture
 * - Full accessibility labels and roles
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

const MIN_DIM = 0.08; // Min 8% dimension guard prevents box collapse (Test Case C)
const HANDLE_TOUCH_SLOP = { top: 16, bottom: 16, left: 16, right: 16 };

export const GarmentRegionSelector: React.FC<GarmentRegionSelectorProps> = ({
  imageUri,
  sourceWidth,
  sourceHeight,
  suggestedRegions = [],
  onConfirmSelection,
  onCancel,
  initialBox,
}) => {
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number }>({
    width: 340,
    height: 380,
  });

  // Normalized box [0, 1]
  const [currentBox, setCurrentBox] = useState<BoundingBoxCoordinates>(
    initialBox ? CropService.clampNormalized(initialBox) : { x: 0.15, y: 0.15, width: 0.70, height: 0.50 }
  );

  const [selectionMethod, setSelectionMethod] = useState<'manual' | 'suggested'>('manual');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  const boxRef = useRef(currentBox);
  boxRef.current = currentBox;

  const dragStartBoxRef = useRef<BoundingBoxCoordinates>(currentBox);

  // Active aspect-fit rendered geometry inside container
  const fitGeometry = CropService.computeAspectFit(
    sourceWidth,
    sourceHeight,
    containerLayout.width,
    containerLayout.height
  );
  const fitRef = useRef(fitGeometry);
  fitRef.current = fitGeometry;

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerLayout({ width, height });
    }
  };

  // 1. Move Responder (Drag entire box)
  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartBoxRef.current = { ...boxRef.current };
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { renderedWidth: rw, renderedHeight: rh } = fitRef.current;
        if (rw <= 0 || rh <= 0) return;

        const dxNorm = gestureState.dx / rw;
        const dyNorm = gestureState.dy / rh;

        const start = dragStartBoxRef.current;
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

  // 2. Bottom-Right Corner Resize Responder
  const brPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartBoxRef.current = { ...boxRef.current };
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { renderedWidth: rw, renderedHeight: rh } = fitRef.current;
        if (rw <= 0 || rh <= 0) return;

        const dxNorm = gestureState.dx / rw;
        const dyNorm = gestureState.dy / rh;

        const start = dragStartBoxRef.current;
        const newW = Math.max(MIN_DIM, Math.min(1 - start.x, start.width + dxNorm));
        const newH = Math.max(MIN_DIM, Math.min(1 - start.y, start.height + dyNorm));

        setCurrentBox({
          x: start.x,
          y: start.y,
          width: Number(newW.toFixed(4)),
          height: Number(newH.toFixed(4)),
        });
      },
    })
  ).current;

  // 3. Top-Left Corner Resize Responder
  const tlPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartBoxRef.current = { ...boxRef.current };
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { renderedWidth: rw, renderedHeight: rh } = fitRef.current;
        if (rw <= 0 || rh <= 0) return;

        const dxNorm = gestureState.dx / rw;
        const dyNorm = gestureState.dy / rh;

        const start = dragStartBoxRef.current;
        const maxRight = start.x + start.width;
        const maxBottom = start.y + start.height;

        const newX = Math.max(0, Math.min(maxRight - MIN_DIM, start.x + dxNorm));
        const newY = Math.max(0, Math.min(maxBottom - MIN_DIM, start.y + dyNorm));

        setCurrentBox({
          x: Number(newX.toFixed(4)),
          y: Number(newY.toFixed(4)),
          width: Number((maxRight - newX).toFixed(4)),
          height: Number((maxBottom - newY).toFixed(4)),
        });
      },
    })
  ).current;

  // 4. Top-Right Corner Resize Responder
  const trPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartBoxRef.current = { ...boxRef.current };
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { renderedWidth: rw, renderedHeight: rh } = fitRef.current;
        if (rw <= 0 || rh <= 0) return;

        const dxNorm = gestureState.dx / rw;
        const dyNorm = gestureState.dy / rh;

        const start = dragStartBoxRef.current;
        const maxBottom = start.y + start.height;

        const newY = Math.max(0, Math.min(maxBottom - MIN_DIM, start.y + dyNorm));
        const newW = Math.max(MIN_DIM, Math.min(1 - start.x, start.width + dxNorm));

        setCurrentBox({
          x: start.x,
          y: Number(newY.toFixed(4)),
          width: Number(newW.toFixed(4)),
          height: Number((maxBottom - newY).toFixed(4)),
        });
      },
    })
  ).current;

  // 5. Bottom-Left Corner Resize Responder
  const blPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartBoxRef.current = { ...boxRef.current };
        setSelectionMethod('manual');
        setSelectedSuggestionId(null);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { renderedWidth: rw, renderedHeight: rh } = fitRef.current;
        if (rw <= 0 || rh <= 0) return;

        const dxNorm = gestureState.dx / rw;
        const dyNorm = gestureState.dy / rh;

        const start = dragStartBoxRef.current;
        const maxRight = start.x + start.width;

        const newX = Math.max(0, Math.min(maxRight - MIN_DIM, start.x + dxNorm));
        const newH = Math.max(MIN_DIM, Math.min(1 - start.y, start.height + dyNorm));

        setCurrentBox({
          x: Number(newX.toFixed(4)),
          y: start.y,
          width: Number((maxRight - newX).toFixed(4)),
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

  // Display coordinates anchored to the aspect-fit rendered image rect
  const dispX = fitGeometry.offsetX + currentBox.x * fitGeometry.renderedWidth;
  const dispY = fitGeometry.offsetY + currentBox.y * fitGeometry.renderedHeight;
  const dispW = currentBox.width * fitGeometry.renderedWidth;
  const dispH = currentBox.height * fitGeometry.renderedHeight;

  return (
    <View style={styles.wrapper}>
      {/* Header Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Select Target Garment</Text>
          <Text style={styles.headerSubtitle}>
            Drag box or handles over the specific item to analyze
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

        {/* Ambient Dark Overlay (Dim non-selected areas and letterbox borders) */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Top dark band */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, dispY), backgroundColor: 'rgba(0,0,0,0.58)' }} />
          {/* Bottom dark band */}
          <View style={{ position: 'absolute', top: dispY + dispH, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.58)' }} />
          {/* Left dark band */}
          <View style={{ position: 'absolute', top: dispY, left: 0, width: Math.max(0, dispX), height: dispH, backgroundColor: 'rgba(0,0,0,0.58)' }} />
          {/* Right dark band */}
          <View style={{ position: 'absolute', top: dispY, left: dispX + dispW, right: 0, height: dispH, backgroundColor: 'rgba(0,0,0,0.58)' }} />
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
          <View
            {...movePanResponder.panHandlers}
            hitSlop={HANDLE_TOUCH_SLOP}
            style={styles.centerMoveHandle}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Garment selection move handle"
            accessibilityHint="Drag to reposition selection box over target garment"
          >
            <Move size={18} color="#FFFFFF" />
          </View>

          {/* Top-Left Corner Handle */}
          <View
            {...tlPanResponder.panHandlers}
            hitSlop={HANDLE_TOUCH_SLOP}
            style={[styles.cornerHandle, styles.tlCorner]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel="Top-left resize handle"
          />

          {/* Top-Right Corner Handle */}
          <View
            {...trPanResponder.panHandlers}
            hitSlop={HANDLE_TOUCH_SLOP}
            style={[styles.cornerHandle, styles.trCorner]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel="Top-right resize handle"
          />

          {/* Bottom-Left Corner Handle */}
          <View
            {...blPanResponder.panHandlers}
            hitSlop={HANDLE_TOUCH_SLOP}
            style={[styles.cornerHandle, styles.blCorner]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel="Bottom-left resize handle"
          />

          {/* Bottom-Right Corner Handle */}
          <View
            {...brPanResponder.panHandlers}
            hitSlop={HANDLE_TOUCH_SLOP}
            style={[styles.cornerHandle, styles.brCorner]}
            accessible={true}
            accessibilityRole="adjustable"
            accessibilityLabel="Bottom-right resize handle"
          />
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
                  accessible={true}
                  accessibilityRole="button"
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Cancel garment selection"
        >
          <X size={18} color={colors.textSecondary} />
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleReset}
          style={[styles.actionBtn, styles.resetBtn]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Reset selection box to default center"
        >
          <RotateCcw size={16} color={colors.text} />
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleConfirm}
          style={[styles.actionBtn, styles.confirmBtn]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Confirm target garment selection"
          accessibilityHint="Crops the selected garment and sends it for AI analysis"
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
    backgroundColor: '#0F0F11',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  centerMoveHandle: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    ...shadows.subtle,
  },
  cornerHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    ...shadows.subtle,
    zIndex: 10,
  },
  tlCorner: {
    top: -10,
    left: -10,
  },
  trCorner: {
    top: -10,
    right: -10,
  },
  blCorner: {
    bottom: -10,
    left: -10,
  },
  brCorner: {
    bottom: -10,
    right: -10,
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

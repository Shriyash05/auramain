import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { WardrobeGapService } from '../../src/services/intelligence/wardrobeGapService';
import { productDiscoveryProvider } from '../../src/services/commerce/productDiscoveryProvider';
import { WardrobeGap, ProductItem } from '../../src/types/intelligence';
import { Typography } from '../../src/components/ui/Typography';
import { Button } from '../../src/components/ui/Button';
import { GlassSurface } from '../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../src/constants/theme';
import { ArrowLeft, Sparkles, ExternalLink, Tag } from 'lucide-react-native';

export default function GapDiscoveryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [gap, setGap] = useState<WardrobeGap | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user || !id) return;
      try {
        setIsLoading(true);
        const gaps = await WardrobeGapService.detectWardrobeGaps(user.id);
        const found = gaps.find((g) => g.id === id);
        if (found) {
          setGap(found);
          const prods = await productDiscoveryProvider.discoverProductsForGap(found);
          setProducts(prods);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [user, id]);

  const handleOpenProduct = (url: string) => {
    if (url.startsWith('http')) {
      Linking.openURL(url);
    } else {
      Alert.alert('Product Discovery', 'This curated piece matches your wardrobe gap specifications.');
    }
  };

  if (!gap) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Typography variant="body" color={colors.textSecondary}>
            Loading product discovery...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title} numberOfLines={1}>
            {gap.title}
          </Typography>
          <View style={styles.placeholder} />
        </View>

        {/* Gap Summary Card */}
        <GlassSurface style={styles.summaryCard}>
          <View style={styles.badgeRow}>
            <Sparkles size={14} color={colors.text} />
            <Typography variant="caption" color={colors.text} style={styles.badgeText}>
              WARDROBE GAP • +{gap.potentialOutfitsUnlocked} OUTFITS UNLOCKED
            </Typography>
          </View>
          <Typography variant="title" style={styles.summaryTitle}>
            {gap.title}
          </Typography>
          <Typography variant="body" color={colors.textSecondary} style={styles.summaryDesc}>
            {gap.whyThisWorks}
          </Typography>
        </GlassSurface>

        {/* Product Items */}
        <View style={styles.section}>
          <Typography variant="label" style={styles.sectionHeading}>
            MATCHING DISCOVERIES ({products.length})
          </Typography>

          <View style={styles.productsList}>
            {products.map((prod) => (
              <GlassSurface key={prod.id} style={styles.productCard}>
                <View style={styles.productTopRow}>
                  <View style={styles.brandBadge}>
                    <Typography variant="caption" color={colors.text} style={styles.brandText}>
                      {prod.brand.toUpperCase()}
                    </Typography>
                  </View>
                  <Typography variant="caption" color={colors.text} style={styles.matchScore}>
                    {prod.matchScore}% GAP MATCH
                  </Typography>
                </View>

                <Typography variant="title" style={styles.productTitle}>
                  {prod.title}
                </Typography>
                {prod.priceFormatted && (
                  <Typography variant="body" style={styles.productPrice}>
                    {prod.priceFormatted}
                  </Typography>
                )}

                <View style={styles.reasonBox}>
                  <Typography variant="caption" color={colors.textSecondary} style={styles.reasonText}>
                    💡 {prod.matchReason}
                  </Typography>
                </View>

                <Button
                  label="View Product Details"
                  variant="outline"
                  onPress={() => handleOpenProduct(prod.productUrl)}
                  icon={<ExternalLink size={14} color={colors.text} />}
                  style={styles.openBtn}
                />
              </GlassSurface>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  placeholder: {
    width: 32,
  },
  summaryCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  summaryTitle: {
    fontSize: 18,
    marginVertical: 2,
  },
  summaryDesc: {
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  productsList: {
    gap: spacing.md,
  },
  productCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '700',
  },
  matchScore: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 16,
    marginVertical: 2,
  },
  productPrice: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  reasonBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginVertical: spacing.xs,
  },
  reasonText: {
    lineHeight: 16,
  },
  openBtn: {
    marginTop: spacing.xs,
  },
});

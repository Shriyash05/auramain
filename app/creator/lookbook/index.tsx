import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/hooks/useAuth';
import { CreatorService } from '../../../src/services/creator/creatorService';
import { Lookbook } from '../../../src/types/creator';
import { Typography } from '../../../src/components/ui/Typography';
import { Button } from '../../../src/components/ui/Button';
import { GlassSurface } from '../../../src/components/ui/GlassSurface';
import { colors, spacing, radii, shadows } from '../../../src/constants/theme';
import { ArrowLeft, Plus, BookOpen, ChevronRight } from 'lucide-react-native';

export default function LookbooksScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const list = await CreatorService.getLookbooks(user.id);
    setLookbooks(list);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateLookbook = async () => {
    if (!user || !newTitle.trim()) return;
    try {
      await CreatorService.createLookbook(user.id, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        look_ids: [],
        is_published: true,
      });
      setNewTitle('');
      setNewDesc('');
      setShowCreate(false);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Could not create lookbook.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Typography variant="title" style={styles.title}>
            Lookbooks
          </Typography>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCreate(!showCreate)} style={styles.addBtn}>
            <Plus size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Create Lookbook Form */}
        {showCreate && (
          <GlassSurface style={styles.createCard}>
            <Typography variant="title" style={styles.createCardTitle}>
              Create New Lookbook
            </Typography>
            <TextInput
              style={styles.input}
              placeholder="Lookbook Title (e.g. Summer in Paris)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (Optional)"
              placeholderTextColor={colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
            />
            <Button label="Save Lookbook" variant="primary" onPress={handleCreateLookbook} style={styles.saveBtn} />
          </GlassSurface>
        )}

        {/* Lookbooks List */}
        <View style={styles.section}>
          {lookbooks.length > 0 ? (
            <View style={styles.booksList}>
              {lookbooks.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/creator/lookbook/${b.id}` as any)}
                  style={styles.bookRowCard}
                >
                  <View style={styles.bookIconBox}>
                    <BookOpen size={22} color={colors.text} />
                  </View>
                  <View style={styles.bookInfo}>
                    <Typography variant="title" style={styles.bookTitle}>
                      {b.title}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted}>
                      {b.look_ids.length} Saved Looks • {b.description || 'Collection'}
                    </Typography>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <GlassSurface style={styles.emptyCard}>
              <Typography variant="body" color={colors.textSecondary} style={styles.emptyText}>
                No lookbooks yet. Tap + to organize your published looks into seasonal lookbooks.
              </Typography>
            </GlassSurface>
          )}
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
  addBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 20,
    color: colors.text,
  },
  createCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  createCardTitle: {
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 14,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    marginVertical: 4,
    fontFamily: 'System',
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xs,
  },
  booksList: {
    gap: spacing.sm,
  },
  bookRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.subtle,
  },
  bookIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
  },
  emptyCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
  },
});

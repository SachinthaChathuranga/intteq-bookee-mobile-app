import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fetchSalons } from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { palette } from '../../theme/palette';
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  Input,
  RatingBadge,
  Screen,
  SkeletonCard,
  haptics,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

const SALON_IMAGE_COVERS = [
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
];

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export function ExploreScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'haircut' | 'beard' | 'kids'>('all');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const filterKeywords: Record<'all' | 'haircut' | 'beard' | 'kids', string> = {
    all: '',
    haircut: 'hair',
    beard: 'beard',
    kids: 'kid',
  };

  const effectiveQuery = searchTerm.trim() || filterKeywords[selectedFilter] || undefined;

  const salonsQuery = useQuery({
    queryKey: ['customer-salons-search', effectiveQuery],
    queryFn: () => fetchSalons({ query: effectiveQuery }),
  });

  const salons = salonsQuery.data?.salons ?? [];

  const toggleFavorite = (id: string) => {
    haptics.light();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Screen
      scrollable
      refreshing={salonsQuery.isRefetching}
      onRefresh={() => salonsQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          {t('explore.title')}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {t('explore.placeholder')}
        </AppText>
      </View>

      {/* Pill Search Input with Right Magnifying Glass */}
      <Input
        placeholder={t('explore.searchPlaceholder')}
        value={searchTerm}
        onChangeText={setSearchTerm}
        onClear={() => setSearchTerm('')}
        rightIcon={<Ionicons name="search" size={20} color={colors.textMuted} />}
        clearable
        pill
      />

      {/* Filter Chips Horizontal Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          label={t('explore.filterAll')}
          selected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
        />
        <Chip
          label={t('explore.filterHaircut')}
          selected={selectedFilter === 'haircut'}
          onPress={() => setSelectedFilter('haircut')}
        />
        <Chip
          label={t('explore.filterBeard')}
          selected={selectedFilter === 'beard'}
          onPress={() => setSelectedFilter('beard')}
        />
        <Chip
          label={t('explore.filterKids')}
          selected={selectedFilter === 'kids'}
          onPress={() => setSelectedFilter('kids')}
        />
      </ScrollView>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '600' }}>
          {searchTerm.trim()
            ? `Results for "${searchTerm.trim()}"`
            : `${salons.length} salons nearby`}
        </AppText>
        <Badge label={String(salons.length)} variant="primary" />
      </View>

      {/* List State */}
      {salonsQuery.isLoading ? (
        <View style={{ gap: spacing.lg }}>
          <SkeletonCard height={220} />
          <SkeletonCard height={220} />
        </View>
      ) : salons.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={t('explore.empty')}
          description={t('explore.emptySub')}
          actionLabel="Clear Search"
          onAction={() => {
            setSearchTerm('');
            setSelectedFilter('all');
          }}
        />
      ) : (
        salons.map((salon, index) => {
          const minPrice =
            salon.services.length > 0
              ? Math.min(...salon.services.map((s) => s.price))
              : null;
          const coverImage = SALON_IMAGE_COVERS[index % SALON_IMAGE_COVERS.length];

          return (
            <Card
              key={salon.id}
              coverImage={coverImage}
              coverHeight={160}
              floatingBadge={<RatingBadge rating="4.7" />}
              floatingAction={
                <Pressable
                  onPress={() => toggleFavorite(salon.id)}
                  style={[styles.floatingHeartBtn, { backgroundColor: colors.surface }]}
                >
                  <Ionicons
                    name={favorites[salon.id] ? 'heart' : 'heart-outline'}
                    size={18}
                    color={favorites[salon.id] ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              }
              onPress={() => {
                haptics.light();
                navigation.navigate('Booking', { branchId: salon.id, initialStep: 1 });
              }}
              style={styles.salonCard}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="heading" style={{ fontSize: 18 }}>
                    {salon.business_name}
                  </AppText>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color={colors.primary} />
                    <AppText
                      variant="caption"
                      style={{ color: colors.primary, fontWeight: '700' }}
                    >
                      {salon.branch_name}
                    </AppText>
                  </View>
                </View>

                {salon.distance_km !== null ? (
                  <Badge label={`${salon.distance_km} km`} variant="primary" />
                ) : salon.active_barbers_count > 0 ? (
                  <Badge label={`${salon.active_barbers_count} on shift`} variant="success" />
                ) : null}
              </View>

              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {salon.address}
              </AppText>

              {/* Services info footer */}
              <View
                style={[
                  styles.cardFooter,
                  { borderTopColor: colors.border, borderTopWidth: 1 },
                ]}
              >
                <View style={styles.serviceMeta}>
                  <Ionicons name="cut-outline" size={16} color={colors.textMuted} />
                  <AppText variant="caption" style={{ fontWeight: '600' }}>
                    {t('explore.servicesCount', { count: salon.services.length })}
                  </AppText>
                </View>

                {minPrice !== null ? (
                  <AppText
                    variant="caption"
                    style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}
                  >
                    {t('explore.fromPrice', { price: formatCurrency(minPrice) })}
                  </AppText>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    gap: 4,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  salonCard: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingHeartBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

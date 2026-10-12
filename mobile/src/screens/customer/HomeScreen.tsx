import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { fetchSalons } from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Card, EmptyState, Screen, SkeletonCard, radius, spacing } from '../../ui';
import { formatCurrency } from '../../utils/format';

interface Props {
  navigation: {
    navigate: (screen: string) => void;
  };
}

// Curated high-res salon photo covers for aesthetic presentation
const SALON_IMAGE_COVERS = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
];

export function HomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const salonsQuery = useQuery({
    queryKey: ['customer-salons'],
    queryFn: () => fetchSalons(),
  });

  const salons = salonsQuery.data?.salons ?? [];

  return (
    <Screen
      scrollable
      refreshing={salonsQuery.isRefetching}
      onRefresh={() => salonsQuery.refetch()}
      contentContainerStyle={styles.container}
    >
      {/* Large Header Title & Greeting */}
      <View style={styles.header}>
        <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '600' }}>
          {t('term.salon').toUpperCase()}
        </AppText>
        <AppText variant="title" style={styles.title}>
          {t('home.welcome', { name: user?.name ?? '' })}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {t('home.placeholder', { salon: t('term.salon') })}
        </AppText>
      </View>

      {/* Quick Search Action Bar */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => navigation.navigate('Explore')}
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <AppText variant="body" style={{ color: colors.textMuted, flex: 1, marginLeft: 8 }}>
          {t('explore.searchPlaceholder')}
        </AppText>
      </TouchableOpacity>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText variant="heading" style={{ fontSize: 20 }}>
            {t('home.featuredSalons')}
          </AppText>
          {salons.length > 0 ? (
            <Badge label={String(salons.length)} variant="primary" />
          ) : null}
        </View>
      </View>

      {/* Content Feed */}
      {salonsQuery.isLoading ? (
        <View style={{ gap: spacing.lg }}>
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </View>
      ) : salons.length === 0 ? (
        <EmptyState
          icon="cut-outline"
          title={t('explore.empty')}
          description={t('explore.emptySub')}
          actionLabel={t('nav.explore')}
          onAction={() => navigation.navigate('Explore')}
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
              onPress={() => navigation.navigate('Explore')}
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

                {salon.active_barbers_count > 0 ? (
                  <Badge
                    label={`${salon.active_barbers_count} on shift`}
                    variant="success"
                  />
                ) : null}
              </View>

              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {salon.address}
              </AppText>

              {/* Bottom Info Bar */}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
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
});

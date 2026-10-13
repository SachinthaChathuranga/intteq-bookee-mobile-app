import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  addCustomerFavourite,
  fetchBarbers,
  fetchCustomerActiveQueue,
  fetchCustomerFavourites,
  fetchSalons,
  removeCustomerFavourite,
  type FeaturedBarber,
  type SalonSearchResult,
} from '../../api/customer';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { palette } from '../../theme/palette';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  RatingBadge,
  Screen,
  SkeletonCard,
  haptics,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

interface Props {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

const SALON_IMAGE_COVERS = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
];

const MOCK_BARBERS = [
  { id: 'b1', name: 'Amal Perera', salon: 'Kasun’s Salon - Colombo', branch_id: '', rating: 4.8, reviews: 42 },
  { id: 'b2', name: 'Nishantha Fernando', salon: 'Kasun’s Salon - Kandy', branch_id: '', rating: 4.7, reviews: 50 },
];

export function HomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { width: windowWidth } = useWindowDimensions();

  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  const activeQueueQuery = useQuery({
    queryKey: ['customer-active-queue'],
    queryFn: fetchCustomerActiveQueue,
    refetchInterval: 5000,
  });

  const activeQueue = activeQueueQuery.data;
  useQueueSocket(activeQueue?.branch_id);

  const salonsQuery = useQuery({
    queryKey: ['customer-salons'],
    queryFn: () => fetchSalons(),
  });

  const barbersQuery = useQuery({
    queryKey: ['customer-barbers'],
    queryFn: () => fetchBarbers(),
  });

  const salons = salonsQuery.data?.salons ?? [];
  const barbers = barbersQuery.data?.barbers?.length
    ? barbersQuery.data.barbers
    : MOCK_BARBERS;

  const queryClient = useQueryClient();
  const favouritesQuery = useQuery({
    queryKey: ['customer-favourites'],
    queryFn: fetchCustomerFavourites,
  });

  const favouriteSet = new Set(favouritesQuery.data?.map((f) => f.target_id) ?? []);

  const toggleFavouriteMutation = useMutation({
    mutationFn: async ({ type, targetId }: { type: 'SALON' | 'BARBER'; targetId: string }) => {
      if (favouriteSet.has(targetId)) {
        await removeCustomerFavourite(type, targetId);
      } else {
        await addCustomerFavourite(type, targetId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-favourites'] });
    },
  });

  const toggleFavorite = (type: 'SALON' | 'BARBER', id: string) => {
    haptics.light();
    toggleFavouriteMutation.mutate({ type, targetId: id });
  };

  const CAROUSEL_CARD_WIDTH = windowWidth - spacing.lg * 2;
  const CAROUSEL_SNAP_INTERVAL = CAROUSEL_CARD_WIDTH + spacing.md;

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_SNAP_INTERVAL);
    if (index !== activeCarouselIndex && index >= 0 && index < salons.length) {
      setActiveCarouselIndex(index);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Top Bar Header: Profile Avatar + Bookee Logo + Greeting */}
      <View style={styles.topBar}>
        <Avatar name={user?.name} size="md" />
        <View style={styles.topBarText}>
          <View style={styles.logoRow}>
            <AppText style={[styles.logoText, { color: colors.text }]}>Book</AppText>
            <AppText style={[styles.logoAccent, { color: colors.primary }]}>ee</AppText>
          </View>
          <AppText variant="caption" style={{ color: colors.textMuted, fontSize: 13 }}>
            {t('home.welcome', { name: user?.name ?? '' })}
          </AppText>
        </View>
      </View>

      {/* In-Queue Live Card (SPEC §4.4) */}
      {activeQueue && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            haptics.light();
            navigation.navigate('CustomerWait');
          }}
          style={[
            styles.inQueueCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <View style={styles.inQueueTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge label={activeQueue.token_number ?? 'Token'} variant="primary" />
              <Badge
                label={t('waitScreen.position', { position: activeQueue.position })}
                variant="neutral"
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {t('waitScreen.inQueueCardView')}
              </AppText>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>

          <View style={{ gap: 2, marginTop: 4 }}>
            <AppText variant="bodyBold" style={{ fontSize: 15 }}>
              {activeQueue.branch_name}
            </AppText>
            <AppText variant="caption" style={{ color: colors.textMuted }}>
              {activeQueue.barber_name ? `${t('waitScreen.barber')}: ${activeQueue.barber_name}` : t('waitScreen.anyBarber')} • {activeQueue.people_ahead === 0 ? t('waitScreen.youAreNext') : t('waitScreen.peopleAhead', { count: activeQueue.people_ahead })} • {t('waitScreen.estimatedWait', { minutes: activeQueue.estimated_wait_minutes })}
            </AppText>
          </View>
        </TouchableOpacity>
      )}

      {/* 2. Hero Headline (Centered, Friendly) */}
      <View style={styles.heroSection}>
        <AppText style={[styles.heroTitle, { color: colors.text }]}>
          {t('home.findSalonTitle')}
        </AppText>
        <AppText style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          {t('home.findSalonSubtitle')}
        </AppText>
      </View>

      {/* 3. Pill Search Input with Right Magnifying Glass */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          haptics.light();
          navigation.navigate('Explore');
        }}
        style={[
          styles.pillSearchBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <AppText variant="body" style={{ color: colors.textMuted, flex: 1 }}>
          {t('explore.searchPlaceholder')}
        </AppText>
        <Ionicons name="search" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* 4. Section Label: FEATURED SALONS */}
      <View style={styles.sectionHeaderRow}>
        <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
          {t('home.featuredSalons').toUpperCase()}
        </AppText>
      </View>

      {/* 5. Horizontal Swipeable Carousel */}
      {salonsQuery.isLoading ? (
        <SkeletonCard height={240} />
      ) : salons.length === 0 ? (
        <EmptyState
          icon="cut-outline"
          title={t('explore.empty')}
          description={t('explore.emptySub')}
          actionLabel={t('nav.explore')}
          onAction={() => navigation.navigate('Explore')}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <FlatList
            horizontal
            data={salons.slice(0, 5)}
            keyExtractor={(item) => `carousel-${item.id}`}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CAROUSEL_SNAP_INTERVAL}
            decelerationRate="fast"
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carouselContent}
            renderItem={({ item, index }) => (
              <Card
                coverImage={SALON_IMAGE_COVERS[index % SALON_IMAGE_COVERS.length]}
                coverHeight={170}
                floatingBadge={<RatingBadge rating="4.7" />}
                floatingAction={
                  <Pressable
                    onPress={() => toggleFavorite('SALON', item.id)}
                    style={[styles.floatingHeartBtn, { backgroundColor: colors.surface }]}
                  >
                    <Ionicons
                      name={favouriteSet.has(item.id) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favouriteSet.has(item.id) ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                }
                onPress={() => {
                  haptics.light();
                  navigation.navigate('Booking', { branchId: item.id, initialStep: 1 });
                }}
                style={[styles.featuredCard, { width: CAROUSEL_CARD_WIDTH }]}
              >
                <AppText style={[styles.salonCardTitle, { color: colors.primary }]}>
                  {item.business_name}
                </AppText>

                <View style={styles.salonInfoRow}>
                  <Ionicons name="location-sharp" size={15} color={colors.text} />
                  <AppText variant="body" style={{ color: colors.text, fontSize: 14 }}>
                    {item.branch_name}, {item.address}
                  </AppText>
                </View>

                <View style={styles.salonInfoRow}>
                  <Ionicons name="people" size={15} color={colors.text} />
                  <AppText variant="body" style={{ color: colors.text, fontSize: 14 }}>
                    {t('home.barbersCount', { count: item.active_barbers_count || 3 })}
                  </AppText>
                </View>
              </Card>
            )}
          />

          {/* Carousel Pagination Dots */}
          {salons.length > 1 ? (
            <View style={styles.dotsRow}>
              {salons.slice(0, 5).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === activeCarouselIndex ? colors.primary : colors.border,
                      width: i === activeCarouselIndex ? 18 : 8,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* 6. Section Label: AVAILABLE BARBERS */}
      <View style={styles.sectionHeaderRow}>
        <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
          {t('home.availableBarbers').toUpperCase()}
        </AppText>
      </View>

      {/* 7. Barber Horizontal Cards */}
      <View style={{ gap: spacing.md }}>
        {barbers.map((barber) => (
          <Card
            key={barber.id}
            onPress={() => {
              haptics.light();
              navigation.navigate('Booking', {
                preselectedBarberId: barber.id,
                branchId: (barber as any).branch_id || undefined,
                initialStep: 2,
              });
            }}
            style={styles.barberRowCard}
          >
            <View style={styles.barberContentRow}>
              <Avatar name={barber.name} shape="square" size="lg" status="active" />

              <View style={styles.barberDetails}>
                <AppText style={[styles.barberName, { color: colors.text }]}>
                  {barber.name}
                </AppText>
                <View style={styles.barberSalonRow}>
                  <Ionicons name="cut-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {(barber as any).salon ||
                      `${(barber as any).business_name || ''} - ${(barber as any).branch_name || ''}`}
                  </AppText>
                </View>
              </View>

              <View style={styles.barberTrailing}>
                <RatingBadge
                  rating={(barber as any).rating ?? (barber as any).avg_rating ?? '4.8'}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => toggleFavorite('BARBER', barber.id)}
                  >
                    <Ionicons
                      name={favouriteSet.has(barber.id) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favouriteSet.has(barber.id) ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* 8. Section Label: ALL SALONS */}
      {salons.length > 0 ? (
        <View style={styles.sectionHeaderRow}>
          <AppText style={[styles.sectionTrackedTitle, { color: colors.textMuted }]}>
            {t('home.allSalons').toUpperCase()}
          </AppText>
        </View>
      ) : null}
    </View>
  );

  const renderSalonItem = ({ item, index }: { item: SalonSearchResult; index: number }) => {
    const minPrice =
      item.services.length > 0
        ? Math.min(...item.services.map((s) => s.price))
        : null;
    const coverImage = SALON_IMAGE_COVERS[index % SALON_IMAGE_COVERS.length];

    return (
      <View style={styles.verticalSalonItemWrapper}>
        <Card
          coverImage={coverImage}
          coverHeight={160}
          floatingBadge={<RatingBadge rating="4.7" />}
          floatingAction={
            <Pressable
              onPress={() => toggleFavorite('SALON', item.id)}
              style={[styles.floatingHeartBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name={favouriteSet.has(item.id) ? 'heart' : 'heart-outline'}
                size={18}
                color={favouriteSet.has(item.id) ? colors.primary : colors.textMuted}
              />
            </Pressable>
          }
          onPress={() => {
            haptics.light();
            navigation.navigate('Booking', { branchId: item.id, initialStep: 1 });
          }}
          style={styles.verticalSalonCard}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="heading" style={{ fontSize: 18 }}>
                {item.business_name}
              </AppText>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color={colors.primary} />
                <AppText
                  variant="caption"
                  style={{ color: colors.primary, fontWeight: '700' }}
                >
                  {item.branch_name}
                </AppText>
              </View>
            </View>

            {item.distance_km !== null ? (
              <Badge label={`${item.distance_km} km`} variant="primary" />
            ) : item.active_barbers_count > 0 ? (
              <Badge label={`${item.active_barbers_count} on shift`} variant="success" />
            ) : null}
          </View>

          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {item.address}
          </AppText>

          <View
            style={[
              styles.cardFooter,
              { borderTopColor: colors.border, borderTopWidth: 1 },
            ]}
          >
            <View style={styles.serviceMeta}>
              <Ionicons name="cut-outline" size={16} color={colors.textMuted} />
              <AppText variant="caption" style={{ fontWeight: '600' }}>
                {t('explore.servicesCount', { count: item.services.length })}
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
      </View>
    );
  };

  return (
    <Screen scrollable={false} contentContainerStyle={styles.screenContainer}>
      <FlatList
        data={salons}
        keyExtractor={(item) => item.id}
        renderItem={renderSalonItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(salonsQuery.isRefetching)}
            onRefresh={() => salonsQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: spacing.xxl,
  },
  headerContainer: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  inQueueCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: spacing.xs,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  inQueueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarText: {
    gap: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '900',
  },
  heroSection: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  pillSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    marginTop: spacing.xs,
  },
  sectionTrackedTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  carouselContent: {
    gap: spacing.md,
  },
  featuredCard: {
    gap: spacing.xs,
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
  salonCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  salonInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  barberRowCard: {
    padding: spacing.md,
  },
  barberContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  barberDetails: {
    flex: 1,
    gap: 4,
  },
  barberName: {
    fontSize: 16,
    fontWeight: '700',
  },
  barberSalonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barberTrailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  verticalSalonItemWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  verticalSalonCard: {
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

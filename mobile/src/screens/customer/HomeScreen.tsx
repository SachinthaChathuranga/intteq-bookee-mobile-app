import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  addCustomerFavourite,
  fetchBarbers,
  fetchCustomerActiveQueue,
  fetchCustomerAppointments,
  fetchCustomerFavourites,
  fetchSalons,
  removeCustomerFavourite,
  type FeaturedBarber,
  type SalonSearchResult,
} from '../../api/customer';
import { useQueueSocket } from '../../api/socket';
import { AppText } from '../../components/AppText';
import { appConfig } from '../../config/app';
import { useT } from '../../i18n';
import type { CustomerStackParamList, CustomerTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  BarberCard,
  Card,
  Chip,
  EmptyState,
  IconButton,
  SalonCard,
  Screen,
  SearchInput,
  SectionHeader,
  SkeletonCard,
  StatusBadge,
  getShadow,
  lightImpact,
  radius,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'HomeTab'>,
  NativeStackScreenProps<CustomerStackParamList>
>;

type FilterType = 'all' | 'haircut' | 'beard' | 'kids';

export function HomeScreen({ navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const salonsQuery = useQuery({
    queryKey: ['salons', ''],
    queryFn: () => fetchSalons({ query: undefined }),
  });

  const barbersQuery = useQuery({
    queryKey: ['barbers'],
    queryFn: () => fetchBarbers(),
  });

  const activeQueueQuery = useQuery({
    queryKey: ['customer-active-queue'],
    queryFn: fetchCustomerActiveQueue,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['customer-appointments'],
    queryFn: fetchCustomerAppointments,
  });

  const favouritesQuery = useQuery({
    queryKey: ['customer-favourites'],
    queryFn: fetchCustomerFavourites,
  });

  useQueueSocket(activeQueueQuery.data?.branch_id);

  const toggleFavMutation = useMutation({
    mutationFn: async ({
      type,
      targetId,
      isFav,
    }: {
      type: 'SALON' | 'BARBER';
      targetId: string;
      isFav: boolean;
    }) => {
      if (isFav) {
        await removeCustomerFavourite(type, targetId);
      } else {
        await addCustomerFavourite(type, targetId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-favourites'] });
    },
  });

  const favSalonIds = useMemo(() => {
    const list = favouritesQuery.data ?? [];
    return new Set(list.filter((f) => f.type === 'SALON').map((f) => f.target_id));
  }, [favouritesQuery.data]);

  const favBarberIds = useMemo(() => {
    const list = favouritesQuery.data ?? [];
    return new Set(list.filter((f) => f.type === 'BARBER').map((f) => f.target_id));
  }, [favouritesQuery.data]);

  const salons = salonsQuery.data?.salons ?? [];
  const barbers = barbersQuery.data?.barbers ?? [];

  const sortedSalons = useMemo(() => {
    return [...salons].sort((a, b) => {
      const aFav = favSalonIds.has(a.id) ? 1 : 0;
      const bFav = favSalonIds.has(b.id) ? 1 : 0;
      return bFav - aFav;
    });
  }, [salons, favSalonIds]);

  const sortedBarbers = useMemo(() => {
    return [...barbers].sort((a, b) => {
      const aFav = favBarberIds.has(a.id) ? 1 : 0;
      const bFav = favBarberIds.has(b.id) ? 1 : 0;
      return bFav - aFav;
    });
  }, [barbers, favBarberIds]);

  const featuredSalons = useMemo(() => sortedSalons.slice(0, 4), [sortedSalons]);

  const nextAppointment = useMemo(() => {
    const list = appointmentsQuery.data?.appointments ?? [];
    const now = Date.now();
    return list
      .filter((a) => a.status === 'BOOKED' && new Date(a.start_at).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
  }, [appointmentsQuery.data]);

  const handleSearchSubmit = () => {
    const q = searchText.trim();
    navigation.navigate('ExploreTab', q ? { initialQuery: q } : undefined);
  };

  const handleFilterPress = (filter: FilterType, queryStr?: string) => {
    setSelectedFilter(filter);
    if (queryStr) {
      navigation.navigate('ExploreTab', { initialQuery: queryStr });
    }
  };

  const openSalonBooking = (salon: SalonSearchResult, preselectedBarber?: FeaturedBarber) => {
    navigation.navigate('Booking', {
      branchId: salon.id,
      branchName: salon.branch_name,
      businessName: salon.business_name,
      address: salon.address,
      phone: salon.phone,
      workingHours: salon.working_hours,
      preselectedBarberId: preselectedBarber?.id,
      preselectedBarberName: preselectedBarber?.name || undefined,
    });
  };

  const handleRefresh = () => {
    void Promise.all([
      salonsQuery.refetch(),
      barbersQuery.refetch(),
      activeQueueQuery.refetch(),
      appointmentsQuery.refetch(),
      favouritesQuery.refetch(),
    ]);
  };

  const isRefreshing =
    salonsQuery.isRefetching ||
    barbersQuery.isRefetching ||
    activeQueueQuery.isRefetching;

  const activeQueue = activeQueueQuery.data;

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Greeting Bar */}
        <View style={styles.topHeader}>
          <Pressable
            onPress={() => navigation.navigate('ProfileTab')}
            style={styles.userRow}
          >
            <Avatar name={user?.name ?? appConfig.name} size="md" status="online" />
            <View style={styles.greetingTextCol}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {appConfig.name}
              </AppText>
              <AppText variant="heading2" numberOfLines={1}>
                {t('home.welcome', { name: user?.name ?? '' })}
              </AppText>
            </View>
          </Pressable>
          <View style={styles.headerActions}>
            <IconButton
              icon="calendar-outline"
              variant="surface"
              onPress={() => navigation.navigate('AppointmentsTab')}
              accessibilityLabel={t('nav.appointments')}
              badgeCount={nextAppointment ? 1 : undefined}
            />
          </View>
        </View>

        {/* Active Live Queue Banner */}
        {activeQueue ? (
          <View style={styles.paddedSection}>
            <Pressable
              onPress={() => {
                lightImpact();
                navigation.navigate('CustomerWait');
              }}
              style={[
                styles.liveQueueBanner,
                getShadow(colors, 'md'),
                {
                  backgroundColor:
                    activeQueue.status === 'CALLED' ? colors.warning : colors.primary,
                },
              ]}
            >
              <View style={styles.liveQueueTop}>
                <View style={styles.livePulseRow}>
                  <View style={[styles.whiteDot, { backgroundColor: colors.onPrimary }]} />
                  <AppText
                    variant="label"
                    style={{ color: colors.onPrimary, letterSpacing: 0.6 }}
                  >
                    {activeQueue.status === 'CALLED'
                      ? t('waitScreen.statusCalled')
                      : t('waitScreen.inQueueCardTitle')}
                  </AppText>
                </View>
                {activeQueue.token_number ? (
                  <View style={[styles.tokenPill, { backgroundColor: colors.overlay }]}>
                    <AppText variant="label" style={{ color: colors.onPrimary }}>
                      #{activeQueue.token_number}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.liveQueueMain}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText
                    variant="heading1"
                    style={{ color: colors.onPrimary, fontWeight: '800' }}
                  >
                    {t('waitScreen.position', { position: activeQueue.position })}
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    style={{ color: colors.onPrimary, opacity: 0.9 }}
                    numberOfLines={1}
                  >
                    {activeQueue.business_name} • {activeQueue.branch_name}
                  </AppText>
                </View>
                <View style={styles.liveQueueCta}>
                  <AppText variant="label" style={{ color: colors.onPrimary }}>
                    {t('waitScreen.inQueueCardView')}
                  </AppText>
                  <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
                </View>
              </View>

              <View style={[styles.liveQueueMetaBar, { borderTopColor: colors.overlay }]}>
                <View style={styles.inlineIconText}>
                  <Ionicons name="people-outline" size={14} color={colors.onPrimary} />
                  <AppText variant="caption" style={{ color: colors.onPrimary }}>
                    {activeQueue.people_ahead === 0
                      ? t('waitScreen.youAreNext')
                      : t('waitScreen.peopleAhead', { count: activeQueue.people_ahead })}
                  </AppText>
                </View>
                <View style={styles.inlineIconText}>
                  <Ionicons name="time-outline" size={14} color={colors.onPrimary} />
                  <AppText variant="caption" style={{ color: colors.onPrimary }}>
                    {t('waitScreen.estimatedWait', {
                      minutes: activeQueue.estimated_wait_minutes,
                    })}
                  </AppText>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Hero Search & Discovery Card */}
        <View style={styles.paddedSection}>
          <Card variant="elevated" padding="lg" style={styles.searchHeroCard}>
            <View style={{ gap: 4 }}>
              <View style={styles.rowBetween}>
                <AppText variant="heading2" style={{ flex: 1 }}>
                  {t('home.findSalonTitle')}
                </AppText>
                <StatusBadge label={t('home.liveQueueReady')} tone="success" size="sm" />
              </View>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('home.findSalonSubtitle')}
              </AppText>
            </View>

            <SearchInput
              placeholder={t('explore.searchPlaceholder')}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              onClear={() => setSearchText('')}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <Chip
                label={t('explore.filterAll')}
                selected={selectedFilter === 'all'}
                leftIcon="sparkles-outline"
                onPress={() => handleFilterPress('all')}
              />
              <Chip
                label={t('explore.filterHaircut')}
                selected={selectedFilter === 'haircut'}
                leftIcon="cut-outline"
                onPress={() => handleFilterPress('haircut', 'Haircut')}
              />
              <Chip
                label={t('explore.filterBeard')}
                selected={selectedFilter === 'beard'}
                leftIcon="man-outline"
                onPress={() => handleFilterPress('beard', 'Beard')}
              />
              <Chip
                label={t('explore.filterKids')}
                selected={selectedFilter === 'kids'}
                leftIcon="happy-outline"
                onPress={() => handleFilterPress('kids', 'Kids')}
              />
            </ScrollView>
          </Card>
        </View>

        {/* Next Upcoming Appointment Summary */}
        {nextAppointment ? (
          <View style={styles.paddedSection}>
            <SectionHeader
              title={t('home.upcomingAppointment')}
              actionLabel={t('common.viewAll')}
              onActionPress={() => navigation.navigate('AppointmentsTab')}
            />
            <Card
              variant="outlined"
              padding="md"
              onPress={() => navigation.navigate('AppointmentsTab')}
              style={{ marginTop: spacing.sm }}
            >
              <View style={styles.rowBetween}>
                <View style={styles.rowCenter}>
                  <View
                    style={[
                      styles.dateBadgeBox,
                      { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder },
                    ]}
                  >
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {nextAppointment.business_name} • {nextAppointment.branch_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {new Date(nextAppointment.start_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(nextAppointment.start_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </AppText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Card>
          </View>
        ) : null}

        {/* Featured Salons Carousel */}
        {featuredSalons.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.paddedHeader}>
              <SectionHeader
                title={t('home.featuredSalons')}
                actionLabel={t('home.quickExplore')}
                onActionPress={() => navigation.navigate('ExploreTab')}
              />
            </View>
            <FlatList
              data={featuredSalons}
              keyExtractor={(item) => `featured-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const isFav = favSalonIds.has(item.id);
                const minPrice =
                  item.services.length > 0
                    ? Math.min(...item.services.map((s) => s.price))
                    : null;
                return (
                  <SalonCard
                    variant="featured"
                    businessName={item.business_name}
                    branchName={item.branch_name}
                    address={item.address}
                    activeBarbersCount={item.active_barbers_count}
                    activeBarbersLabel={t('home.barbersCount', {
                      count: item.active_barbers_count,
                    })}
                    services={item.services}
                    startingPriceLabel={
                      minPrice !== null
                        ? t('explore.fromPrice', { price: formatCurrency(minPrice) })
                        : undefined
                    }
                    isFavourite={isFav}
                    onToggleFavourite={() =>
                      toggleFavMutation.mutate({
                        type: 'SALON',
                        targetId: item.id,
                        isFav,
                      })
                    }
                    onPress={() => openSalonBooking(item)}
                  />
                );
              }}
            />
          </View>
        ) : null}

        {/* Available Barbers Carousel (Real API Data Only) */}
        {sortedBarbers.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.paddedHeader}>
              <SectionHeader title={t('home.availableBarbers')} />
            </View>
            <FlatList
              data={sortedBarbers}
              keyExtractor={(item) => `barber-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const isFav = favBarberIds.has(item.id);
                return (
                  <BarberCard
                    layout="vertical"
                    name={item.name || t('term.barber')}
                    subtitle={item.business_name}
                    avatarUrl={item.avatar_url}
                    rating={item.avg_rating}
                    ratingCount={item.rating_count}
                    isOnline
                    isFavourite={isFav}
                    onToggleFavourite={() =>
                      toggleFavMutation.mutate({
                        type: 'BARBER',
                        targetId: item.id,
                        isFav,
                      })
                    }
                    onPress={() => {
                      const matchingSalon = salons.find((s) => s.id === item.branch_id);
                      if (matchingSalon) {
                        openSalonBooking(matchingSalon, item);
                      } else {
                        navigation.navigate('Booking', {
                          branchId: item.branch_id,
                          branchName: item.branch_name,
                          businessName: item.business_name,
                          preselectedBarberId: item.id,
                          preselectedBarberName: item.name || undefined,
                        });
                      }
                    }}
                  />
                );
              }}
            />
          </View>
        ) : null}

        {/* All Salons Vertical List */}
        <View style={styles.paddedSection}>
          <SectionHeader
            title={t('home.allSalons')}
            actionLabel={t('common.viewAll')}
            onActionPress={() => navigation.navigate('ExploreTab')}
          />

          <View style={styles.verticalList}>
            {salonsQuery.isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : sortedSalons.length === 0 ? (
              <EmptyState
                icon="storefront-outline"
                title={t('explore.empty')}
                description={t('explore.emptySub')}
              />
            ) : (
              sortedSalons.map((salon) => {
                const isFav = favSalonIds.has(salon.id);
                const minPrice =
                  salon.services.length > 0
                    ? Math.min(...salon.services.map((s) => s.price))
                    : null;

                return (
                  <SalonCard
                    key={salon.id}
                    businessName={salon.business_name}
                    branchName={salon.branch_name}
                    address={salon.address}
                    activeBarbersCount={salon.active_barbers_count}
                    activeBarbersLabel={t('home.barbersCount', {
                      count: salon.active_barbers_count,
                    })}
                    services={salon.services}
                    startingPriceLabel={
                      minPrice !== null
                        ? t('explore.fromPrice', { price: formatCurrency(minPrice) })
                        : undefined
                    }
                    isFavourite={isFav}
                    onToggleFavourite={() =>
                      toggleFavMutation.mutate({
                        type: 'SALON',
                        targetId: salon.id,
                        isFav,
                      })
                    }
                    onPress={() => openSalonBooking(salon)}
                  />
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  greetingTextCol: {
    flex: 1,
    gap: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paddedSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  paddedHeader: {
    paddingHorizontal: spacing.lg,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  verticalList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  searchHeroCard: {
    gap: spacing.md,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  dateBadgeBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveQueueBanner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  liveQueueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whiteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tokenPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveQueueMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  liveQueueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveQueueMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inlineIconText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  addCustomerFavourite,
  fetchCustomerFavourites,
  fetchSalons,
  removeCustomerFavourite,
  type SalonSearchResult,
} from '../../api/customer';
import { AppText } from '../../components/AppText';
import { useT } from '../../i18n';
import type { CustomerStackParamList, CustomerTabParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Chip,
  EmptyState,
  ErrorState,
  SalonCard,
  Screen,
  ScreenHeader,
  SearchInput,
  SkeletonCard,
  spacing,
} from '../../ui';
import { formatCurrency } from '../../utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'ExploreTab'>,
  NativeStackScreenProps<CustomerStackParamList>
>;

type FilterCategory = 'all' | 'haircut' | 'beard' | 'kids';

export function ExploreScreen({ route, navigation }: Props) {
  const t = useT();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const initialQuery = route.params?.initialQuery ?? '';
  const [searchText, setSearchText] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  useEffect(() => {
    if (route.params?.initialQuery !== undefined) {
      setSearchText(route.params.initialQuery);
      setDebouncedQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchText]);

  const salonsQuery = useQuery({
    queryKey: ['salons', debouncedQuery],
    queryFn: () => fetchSalons({ query: debouncedQuery || undefined }),
  });

  const favouritesQuery = useQuery({
    queryKey: ['customer-favourites'],
    queryFn: fetchCustomerFavourites,
  });

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

  const salons = salonsQuery.data?.salons ?? [];

  const handleCategorySelect = (cat: FilterCategory, keyword: string) => {
    setActiveCategory(cat);
    setSearchText(keyword);
    setDebouncedQuery(keyword);
  };

  const renderSalonCard = ({ item }: { item: SalonSearchResult }) => {
    const isFav = favSalonIds.has(item.id);
    const minPrice =
      item.services.length > 0
        ? Math.min(...item.services.map((s) => s.price))
        : null;

    return (
      <SalonCard
        businessName={item.business_name}
        branchName={item.branch_name}
        address={item.address}
        activeBarbersCount={item.active_barbers_count}
        activeBarbersLabel={t('home.barbersCount', { count: item.active_barbers_count })}
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
        onPress={() =>
          navigation.navigate('Booking', {
            branchId: item.id,
            branchName: item.branch_name,
            businessName: item.business_name,
            address: item.address,
            phone: item.phone,
            workingHours: item.working_hours,
          })
        }
      />
    );
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <ScreenHeader title={t('explore.title')} subtitle={t('explore.placeholder')} />

        <SearchInput
          placeholder={t('explore.searchPlaceholder')}
          value={searchText}
          onChangeText={(txt) => {
            setSearchText(txt);
            if (!txt) setActiveCategory('all');
          }}
          onClear={() => {
            setSearchText('');
            setDebouncedQuery('');
            setActiveCategory('all');
          }}
        />

        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterStrip}
          >
            <Chip
              label={t('explore.filterAll')}
              selected={activeCategory === 'all' && !debouncedQuery}
              leftIcon="sparkles-outline"
              onPress={() => handleCategorySelect('all', '')}
            />
            <Chip
              label={t('explore.filterHaircut')}
              selected={activeCategory === 'haircut'}
              leftIcon="cut-outline"
              onPress={() => handleCategorySelect('haircut', 'Haircut')}
            />
            <Chip
              label={t('explore.filterBeard')}
              selected={activeCategory === 'beard'}
              leftIcon="man-outline"
              onPress={() => handleCategorySelect('beard', 'Beard')}
            />
            <Chip
              label={t('explore.filterKids')}
              selected={activeCategory === 'kids'}
              leftIcon="happy-outline"
              onPress={() => handleCategorySelect('kids', 'Kids')}
            />
          </ScrollView>
        </View>

        {!salonsQuery.isLoading && !salonsQuery.isError ? (
          <View style={styles.resultsBar}>
            <AppText variant="label" style={{ color: colors.textSecondary }}>
              {debouncedQuery
                ? t('explore.resultsFor', { query: debouncedQuery, count: salons.length })
                : t('explore.nearbyCount', { count: salons.length })}
            </AppText>
          </View>
        ) : null}

        {salonsQuery.isError ? (
          <ErrorState
            title={t('common.error.generic')}
            description={t('common.error.network')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              void salonsQuery.refetch();
            }}
          />
        ) : (
          <FlatList
            data={salons}
            keyExtractor={(item) => item.id}
            renderItem={renderSalonCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={salonsQuery.isRefetching}
                onRefresh={() => {
                  void salonsQuery.refetch();
                }}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              salonsQuery.isLoading ? (
                <View style={styles.skeletonWrap}>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </View>
              ) : (
                <EmptyState
                  icon="search-outline"
                  title={t('explore.empty')}
                  description={t('explore.emptySub')}
                  actionLabel={debouncedQuery ? t('explore.clearSearch') : undefined}
                  onActionPress={
                    debouncedQuery
                      ? () => {
                          setSearchText('');
                          setDebouncedQuery('');
                          setActiveCategory('all');
                        }
                      : undefined
                  }
                />
              )
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  filterStrip: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  skeletonWrap: {
    gap: spacing.md,
  },
});

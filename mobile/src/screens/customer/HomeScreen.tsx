import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { fetchSalons, type SalonSearchResult } from '../../api/customer';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';

interface Props {
  navigation: {
    navigate: (screen: string) => void;
  };
}

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
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={salonsQuery.isRefetching}
            onRefresh={() => salonsQuery.refetch()}
          />
        }
      >
        {/* Header Greeting */}
        <View style={styles.header}>
          <AppText variant="title" style={{ fontSize: 24 }}>
            {t('home.welcome', { name: user?.name ?? '' })}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {t('home.placeholder', { salon: t('term.salon') })}
          </AppText>
        </View>

        {/* Quick Search Banner / Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Explore')}
          style={[styles.searchBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <AppText variant="body" style={{ color: colors.textMuted }}>
            🔍 {t('explore.searchPlaceholder')}
          </AppText>
        </TouchableOpacity>

        {/* Featured Salons Section */}
        <View style={styles.sectionHeader}>
          <AppText variant="body" style={{ fontWeight: '700', fontSize: 18 }}>
            {t('home.featuredSalons')}
          </AppText>
          <Badge label={String(salons.length)} variant="primary" />
        </View>

        {salonsQuery.isLoading ? (
          <Card>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {t('app.loading')}
            </AppText>
          </Card>
        ) : salons.length === 0 ? (
          <Card>
            <AppText variant="body" style={{ fontWeight: '600', textAlign: 'center' }}>
              {t('explore.empty')}
            </AppText>
            <AppText variant="caption" style={{ textAlign: 'center', marginTop: 4, color: colors.textMuted }}>
              {t('explore.emptySub')}
            </AppText>
          </Card>
        ) : (
          salons.map((salon) => {
            const minPrice =
              salon.services.length > 0
                ? Math.min(...salon.services.map((s) => s.price))
                : null;

            return (
              <Card key={salon.id} style={{ gap: 8 }}>
                <View style={styles.salonTitleRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="body" style={{ fontWeight: '700', fontSize: 17 }}>
                      {salon.business_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      📍 {salon.branch_name}
                    </AppText>
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

                {/* Services preview */}
                <View style={[styles.servicesRow, { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 8 }]}>
                  <AppText variant="caption" style={{ fontWeight: '600' }}>
                    {t('explore.servicesCount', { count: salon.services.length })}
                  </AppText>
                  {minPrice !== null ? (
                    <AppText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                      {t('explore.fromPrice', { price: formatCurrency(minPrice) })}
                    </AppText>
                  ) : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  searchBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  salonTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

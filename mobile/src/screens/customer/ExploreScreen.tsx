import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { fetchSalons } from '../../api/customer';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';

export function ExploreScreen() {
  const t = useT();
  const { colors } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');

  const salonsQuery = useQuery({
    queryKey: ['customer-salons-search', searchTerm],
    queryFn: () => fetchSalons({ query: searchTerm.trim() || undefined }),
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
        <AppText variant="title" style={{ fontSize: 24 }}>
          {t('explore.title')}
        </AppText>

        {/* Search Field */}
        <TextField
          label=""
          placeholder={t('explore.searchPlaceholder')}
          value={searchTerm}
          onChangeText={setSearchTerm}
          clearButtonMode="while-editing"
        />

        {/* Results Count Header */}
        <View style={styles.resultsHeader}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {searchTerm.trim() ? `Search results for "${searchTerm.trim()}"` : t('explore.title')}
          </AppText>
          <Badge label={String(salons.length)} variant="primary" />
        </View>

        {/* Loading State */}
        {salonsQuery.isLoading ? (
          <Card>
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {t('app.loading')}
            </AppText>
          </Card>
        ) : salons.length === 0 ? (
          /* Empty State */
          <Card>
            <AppText variant="body" style={{ fontWeight: '600', textAlign: 'center' }}>
              {t('explore.empty')}
            </AppText>
            <AppText variant="caption" style={{ textAlign: 'center', marginTop: 4, color: colors.textMuted }}>
              {t('explore.emptySub')}
            </AppText>
          </Card>
        ) : (
          /* Salon List */
          salons.map((salon) => {
            const minPrice =
              salon.services.length > 0
                ? Math.min(...salon.services.map((s) => s.price))
                : null;

            return (
              <Card key={salon.id} style={{ gap: 8 }}>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="body" style={{ fontWeight: '700', fontSize: 17 }}>
                      {salon.business_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      📍 {salon.branch_name}
                    </AppText>
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

                {/* Services summary */}
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
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleRow: {
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

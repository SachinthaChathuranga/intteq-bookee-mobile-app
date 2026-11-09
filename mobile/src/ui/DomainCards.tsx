import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '../components/AppText';
import { useTheme } from '../theme/ThemeProvider';
import { formatCurrency } from '../utils/format';
import { Avatar } from './Avatar';
import { Badge, StatusBadge, type BadgeTone } from './Badge';
import { Card } from './Card';
import { lightImpact, selectionFeedback } from './haptics';
import { RatingBadge } from './RatingBadge';
import { radius, spacing } from './tokens';

export interface ServiceItemProps {
  name: string;
  durationMinutes: number;
  durationLabel: string;
  price: number;
  selected?: boolean;
  onPress?: () => void;
  rightBadge?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ServiceItem({
  name,
  durationMinutes,
  durationLabel,
  price,
  selected = false,
  onPress,
  rightBadge,
  style,
}: ServiceItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked: selected } : undefined}
      disabled={!onPress}
      onPress={() => {
        if (!onPress) return;
        selectionFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.serviceItem,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.5 : 1,
          opacity: pressed && onPress ? 0.9 : 1,
        },
        style,
      ]}
    >
      {onPress ? (
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: selected ? colors.primary : colors.inputBackground,
              borderColor: selected ? colors.primary : colors.border,
            },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
        </View>
      ) : (
        <View style={[styles.serviceIconBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="cut-outline" size={18} color={colors.primary} />
        </View>
      )}
      <View style={styles.serviceInfo}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {name}
        </AppText>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            {durationLabel || `${durationMinutes} min`}
          </AppText>
        </View>
      </View>
      <View style={styles.serviceRight}>
        <AppText
          variant="bodyBold"
          style={{ color: selected ? colors.primary : colors.text, fontWeight: '700' }}
        >
          {formatCurrency(price)}
        </AppText>
        {rightBadge}
      </View>
    </Pressable>
  );
}

export interface BarberCardProps {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  rating?: number | string;
  ratingCount?: number;
  isOnline?: boolean;
  statusLabel?: string;
  statusTone?: BadgeTone;
  selected?: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onPress?: () => void;
  layout?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

export function BarberCard({
  name,
  subtitle,
  avatarUrl,
  rating,
  ratingCount,
  isOnline,
  statusLabel,
  statusTone = 'success',
  selected = false,
  isFavourite,
  onToggleFavourite,
  onPress,
  layout = 'horizontal',
  style,
}: BarberCardProps) {
  const { colors } = useTheme();
  const numRating = rating !== undefined ? parseFloat(String(rating)) : NaN;

  if (layout === 'vertical') {
    return (
      <Card
        variant={selected ? 'selected' : 'elevated'}
        padding="md"
        onPress={onPress}
        style={[styles.barberVerticalCard, style]}
      >
        {onToggleFavourite ? (
          <Pressable
            onPress={() => {
              lightImpact();
              onToggleFavourite();
            }}
            hitSlop={8}
            style={styles.favCornerBtn}
          >
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavourite ? colors.danger : colors.textMuted}
            />
          </Pressable>
        ) : null}
        <Avatar
          name={name}
          uri={avatarUrl}
          size="lg"
          status={isOnline === undefined ? undefined : isOnline ? 'online' : 'offline'}
        />
        <View style={styles.verticalCenterText}>
          <AppText variant="bodyBold" numberOfLines={1} style={styles.textCenter}>
            {name}
          </AppText>
          {subtitle ? (
            <AppText
              variant="caption"
              numberOfLines={1}
              style={[styles.textCenter, { color: colors.textMuted }]}
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {!isNaN(numRating) ? <RatingBadge rating={numRating} count={ratingCount} /> : null}
        {statusLabel ? <StatusBadge label={statusLabel} tone={statusTone} size="sm" /> : null}
      </Card>
    );
  }

  return (
    <Card
      variant={selected ? 'selected' : 'outlined'}
      padding="md"
      onPress={onPress}
      style={style}
    >
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <Avatar
            name={name}
            uri={avatarUrl}
            size="md"
            status={isOnline === undefined ? undefined : isOnline ? 'online' : 'offline'}
          />
          <View style={styles.flexText}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {name}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" numberOfLines={1}>
                {subtitle}
              </AppText>
            ) : null}
            <View style={styles.badgeWrapRow}>
              {!isNaN(numRating) ? <RatingBadge rating={numRating} count={ratingCount} /> : null}
              {statusLabel ? <StatusBadge label={statusLabel} tone={statusTone} size="sm" /> : null}
            </View>
          </View>
        </View>
        <View style={styles.rightCluster}>
          {onToggleFavourite ? (
            <Pressable
              onPress={() => {
                lightImpact();
                onToggleFavourite();
              }}
              hitSlop={8}
              style={styles.favInlineBtn}
            >
              <Ionicons
                name={isFavourite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavourite ? colors.danger : colors.textMuted}
              />
            </Pressable>
          ) : null}
          {selected ? (
            <View style={[styles.radioDot, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export interface SalonCardProps {
  businessName: string;
  branchName: string;
  address?: string;
  activeBarbersCount?: number;
  activeBarbersLabel?: string;
  services?: { id: string; name: string; price: number }[];
  startingPriceLabel?: string;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onPress: () => void;
  variant?: 'featured' | 'list';
  style?: StyleProp<ViewStyle>;
}

export function SalonCard({
  businessName,
  branchName,
  address,
  activeBarbersCount = 0,
  activeBarbersLabel,
  services = [],
  startingPriceLabel,
  isFavourite,
  onToggleFavourite,
  onPress,
  variant = 'list',
  style,
}: SalonCardProps) {
  const { colors } = useTheme();
  const initials = businessName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Card
      variant="elevated"
      padding="lg"
      onPress={onPress}
      style={[variant === 'featured' && styles.featuredSalonCard, style]}
    >
      <View style={styles.salonHeader}>
        <View style={[styles.salonMonogram, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
          <AppText variant="heading3" style={{ color: colors.primary, fontWeight: '800' }}>
            {initials || 'S'}
          </AppText>
        </View>
        <View style={styles.flexText}>
          <View style={styles.rowBetween}>
            <AppText variant="heading3" numberOfLines={1} style={{ flex: 1 }}>
              {businessName}
            </AppText>
            {onToggleFavourite ? (
              <Pressable
                onPress={() => {
                  lightImpact();
                  onToggleFavourite();
                }}
                hitSlop={8}
                style={styles.favInlineBtn}
              >
                <Ionicons
                  name={isFavourite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavourite ? colors.danger : colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {branchName}
              {address ? ` • ${address}` : ''}
            </AppText>
          </View>
        </View>
      </View>

      {services.length > 0 ? (
        <View style={styles.servicePillsRow}>
          {services.slice(0, 3).map((s) => (
            <View
              key={s.id}
              style={[
                styles.serviceMiniPill,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <AppText variant="caption" style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                {s.name}
              </AppText>
            </View>
          ))}
          {services.length > 3 ? (
            <View
              style={[
                styles.serviceMiniPill,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <AppText variant="caption" style={{ fontSize: 12, color: colors.textMuted }}>
                +{services.length - 3}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.salonFooter, { borderTopColor: colors.divider }]}>
        {activeBarbersLabel ? (
          <StatusBadge
            label={activeBarbersLabel}
            tone={activeBarbersCount > 0 ? 'success' : 'neutral'}
            size="sm"
          />
        ) : <View />}
        <View style={styles.priceArrowCluster}>
          {startingPriceLabel ? (
            <AppText variant="bodyBold" style={{ color: colors.primary }}>
              {startingPriceLabel}
            </AppText>
          ) : null}
          <View style={[styles.arrowCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </View>
        </View>
      </View>
    </Card>
  );
}

export interface QueueTicketCardProps {
  tokenNumber?: string | null;
  customerName: string;
  customerPhone?: string | null;
  services: { id?: string; name: string; duration_minutes?: number; price?: number }[];
  totalPrice?: number;
  totalDurationMinutes?: number;
  statusLabel?: string;
  statusTone?: BadgeTone;
  barberName?: string | null;
  highlighted?: boolean;
  actions?: ReactNode;
  rightControls?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function QueueTicketCard({
  tokenNumber,
  customerName,
  customerPhone,
  services,
  totalPrice,
  totalDurationMinutes,
  statusLabel,
  statusTone = 'primary',
  barberName,
  highlighted = false,
  actions,
  rightControls,
  style,
}: QueueTicketCardProps) {
  const { colors } = useTheme();
  return (
    <Card
      variant={highlighted ? 'selected' : 'elevated'}
      padding="lg"
      style={style}
    >
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View
            style={[
              styles.tokenBadge,
              {
                backgroundColor: highlighted ? colors.primary : colors.primaryLight,
                borderColor: colors.primaryBorder,
              },
            ]}
          >
            <AppText
              variant="bodyBold"
              style={{
                color: highlighted ? colors.onPrimary : colors.primary,
                fontWeight: '800',
              }}
            >
              {tokenNumber || '#'}
            </AppText>
          </View>
          <View style={styles.flexText}>
            <AppText variant="heading3" numberOfLines={1}>
              {customerName}
            </AppText>
            {customerPhone ? (
              <AppText variant="caption">{customerPhone}</AppText>
            ) : barberName ? (
              <AppText variant="caption">{barberName}</AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.rightCluster}>
          {statusLabel ? <StatusBadge label={statusLabel} tone={statusTone} size="sm" /> : null}
          {rightControls}
        </View>
      </View>

      {services.length > 0 ? (
        <View style={styles.servicePillsRow}>
          {services.map((s, idx) => (
            <View
              key={s.id || `${s.name}-${idx}`}
              style={[
                styles.serviceMiniPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="cut-outline" size={12} color={colors.primary} />
              <AppText variant="caption" style={{ color: colors.textSecondary, fontSize: 12 }}>
                {s.name}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {totalPrice !== undefined || totalDurationMinutes !== undefined ? (
        <View style={[styles.ticketMetaRow, { borderTopColor: colors.divider }]}>
          {totalDurationMinutes !== undefined ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <AppText variant="caption">{totalDurationMinutes} min</AppText>
            </View>
          ) : <View />}
          {totalPrice !== undefined ? (
            <AppText variant="bodyBold" style={{ color: colors.text, fontWeight: '700' }}>
              {formatCurrency(totalPrice)}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {actions ? <View style={styles.ticketActions}>{actions}</View> : null}
    </Card>
  );
}

export interface AppointmentCardProps {
  title: string;
  subtitle?: string;
  dateLabel: string;
  timeLabel: string;
  personLabel: string;
  personAvatar?: string | null;
  status: string;
  statusTone?: BadgeTone;
  services: { id?: string; service_id?: string; name: string }[];
  totalPrice: number;
  totalDurationLabel?: string;
  notes?: string | null;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppointmentCard({
  title,
  subtitle,
  dateLabel,
  timeLabel,
  personLabel,
  personAvatar,
  status,
  statusTone = 'primary',
  services,
  totalPrice,
  totalDurationLabel,
  notes,
  actions,
  style,
}: AppointmentCardProps) {
  const { colors } = useTheme();
  return (
    <Card variant="elevated" padding="lg" style={[styles.apptCard, style]}>
      <View style={styles.rowBetween}>
        <View style={styles.flexText}>
          <AppText variant="heading3" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <AppText variant="caption" numberOfLines={1}>
                {subtitle}
              </AppText>
            </View>
          ) : null}
        </View>
        <StatusBadge label={status} tone={statusTone} size="sm" />
      </View>

      <View
        style={[
          styles.dateTimeBanner,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
        ]}
      >
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <AppText variant="bodyBold" style={{ fontSize: 13 }}>
            {dateLabel}
          </AppText>
        </View>
        <View style={[styles.verticalSep, { backgroundColor: colors.border }]} />
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <AppText variant="bodyBold" style={{ fontSize: 13 }}>
            {timeLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <Avatar name={personLabel} uri={personAvatar} size="sm" />
          <AppText variant="bodyBold" style={{ fontSize: 14 }}>
            {personLabel}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="bodyBold" style={{ color: colors.primary, fontWeight: '700' }}>
            {formatCurrency(totalPrice)}
          </AppText>
          {totalDurationLabel ? (
            <AppText variant="caption" style={{ fontSize: 11 }}>
              {totalDurationLabel}
            </AppText>
          ) : null}
        </View>
      </View>

      {services.length > 0 ? (
        <View style={styles.servicePillsRow}>
          {services.map((s, idx) => (
            <Badge
              key={s.id || s.service_id || `${s.name}-${idx}`}
              label={s.name}
              tone="neutral"
              size="sm"
            />
          ))}
        </View>
      ) : null}

      {notes ? (
        <View style={[styles.noteBox, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="document-text-outline" size={14} color={colors.warning} />
          <AppText variant="caption" style={{ color: colors.textSecondary, flex: 1 }}>
            {notes}
          </AppText>
        </View>
      ) : null}

      {actions ? (
        <View style={[styles.apptActions, { borderTopColor: colors.divider }]}>{actions}</View>
      ) : null}
    </Card>
  );
}

export interface FinancialSummaryCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'success' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
}

export function FinancialSummaryCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'primary',
  style,
}: FinancialSummaryCardProps) {
  const { colors } = useTheme();
  const fgMap = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  };
  const bgMap = {
    primary: colors.primaryLight,
    success: colors.successLight,
    warning: colors.warningLight,
    info: colors.infoLight,
  };

  return (
    <Card variant="elevated" padding="md" style={[styles.finCard, style]}>
      <View style={styles.rowBetween}>
        <View style={[styles.finIconCircle, { backgroundColor: bgMap[tone] }]}>
          <Ionicons name={icon} size={18} color={fgMap[tone]} />
        </View>
        {subtitle ? (
          <AppText variant="caption" style={{ fontSize: 11, color: colors.textMuted }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <AppText variant="numeric" style={{ color: colors.text }} numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barberVerticalCard: {
    width: 148,
    alignItems: 'center',
    gap: spacing.sm,
  },
  favCornerBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    padding: 4,
  },
  favInlineBtn: {
    padding: 4,
  },
  verticalCenterText: {
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
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
  flexText: {
    flex: 1,
    gap: 2,
  },
  badgeWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredSalonCard: {
    width: 290,
  },
  salonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  salonMonogram: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
  },
  serviceMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  salonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceArrowCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ticketActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  apptCard: {
    gap: spacing.md,
  },
  dateTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  verticalSep: {
    width: 1,
    height: 18,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  apptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  finCard: {
    flex: 1,
    gap: spacing.md,
  },
  finIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


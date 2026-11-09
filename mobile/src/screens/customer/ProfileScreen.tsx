import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fetchMe, logout, seedWorkspacesDev, updateMe } from '../../api/auth';
import { acceptInvite } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { SUPPORTED_LANGUAGES, useT, type Language } from '../../i18n';
import type { TranslationKey } from '../../i18n/en';
import { useAuthStore, type UserRole } from '../../store/authStore';
import { useSettingsStore, type ThemePreference } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';
import {
  Avatar,
  Badge,
  BottomSheet,
  ConfirmationDialog,
  Divider,
  IconButton,
  Input,
  ScreenHeader,
  SectionHeader,
  haptics,
  radius,
  spacing,
  useToast,
} from '../../ui';

const THEMES: { key: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', icon: 'sunny-outline' },
  { key: 'dark', icon: 'moon-outline' },
  { key: 'system', icon: 'phone-portrait-outline' },
];

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  OWNER: 'business-outline',
  BARBER: 'cut-outline',
  RECEPTIONIST: 'desktop-outline',
  SUPER_ADMIN: 'shield-checkmark-outline',
};

export function ProfileScreen() {
  const t = useT();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const setRoles = useAuthStore((s) => s.setRoles);
  const setUser = useAuthStore((s) => s.setUser);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const signOut = useAuthStore((s) => s.signOut);

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);

  const [seeding, setSeeding] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((res) => {
        if (res.roles) void setRoles(res.roles);
      })
      .catch(() => {
        // non-fatal
      });
  }, [setRoles]);

  const handleLanguageChange = async (lang: Language) => {
    haptics.selection();
    setLanguage(lang);
    try {
      const { user: updated } = await updateMe({ language: lang });
      await setUser(updated);
    } catch {
      // non-fatal
    }
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    haptics.selection();
    setTheme(nextTheme);
    try {
      const { user: updated } = await updateMe({ theme: nextTheme });
      await setUser(updated);
    } catch {
      // non-fatal
    }
  };

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const { user: updated } = await updateMe({ name: trimmed });
      await setUser(updated);
      setEditNameOpen(false);
      showToast({ title: t('profile.nameSaved'), tone: 'success' });
    } catch {
      showToast({ title: t('common.error.generic'), tone: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSeedWorkspaces = async () => {
    setSeeding(true);
    try {
      const res = await seedWorkspacesDev();
      await setRoles(res.roles);
      showToast({ title: t('profile.devSeedSuccess'), tone: 'success' });
    } catch {
      showToast({ title: t('common.error.generic'), tone: 'error' });
    } finally {
      setSeeding(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) return;
    setAccepting(true);
    try {
      await acceptInvite(inviteCode.trim());
      const me = await fetchMe();
      await setRoles(me.roles);
      setInviteCode('');
      showToast({ title: t('barber.joinedSuccess'), tone: 'success' });
    } catch (err: any) {
      showToast({
        title: err?.message || t('common.error.generic'),
        tone: 'error',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutDialogOpen(false);
    try {
      if (refreshToken) await logout(refreshToken);
    } catch {
      // ignore network failure on sign out
    }
    clearWorkspace();
    await signOut();
  };

  const staffRoles = roles;

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('profile.title')} />

        {/* Profile Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <Avatar name={user?.name} size="xl" status="online" />
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <AppText variant="heading1" numberOfLines={1} style={{ flex: 1 }}>
                  {user?.name || '—'}
                </AppText>
                <IconButton
                  icon="create-outline"
                  size="sm"
                  variant="subtle"
                  accessibilityLabel={t('profile.editName')}
                  onPress={() => {
                    setDraftName(user?.name ?? '');
                    setEditNameOpen(true);
                  }}
                />
              </View>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {user?.phone}
                </AppText>
              </View>
              <View style={{ marginTop: 4 }}>
                <Badge label={t('profile.customerRoleBadge')} tone="primary" size="sm" />
              </View>
            </View>
          </View>
        </Card>

        {/* My Workspaces Section */}
        <View style={styles.sectionBlock}>
          <SectionHeader
            title={t('profile.workspaces')}
            subtitle={t('profile.workspacesSubtitle')}
          />

          {staffRoles.length > 0 ? (
            <View style={styles.stackSm}>
              {staffRoles.map((r: UserRole, idx: number) => {
                const roleKey = `role.${r.role}` as TranslationKey;
                const subtitle = [r.business_name, r.branch_name]
                  .filter(Boolean)
                  .join(' • ');
                const iconName = ROLE_ICONS[r.role] ?? 'briefcase-outline';

                return (
                  <Card
                    key={`${r.role}-${r.branch_id ?? idx}`}
                    onPress={() => {
                      haptics.medium();
                      setActiveWorkspace(r);
                    }}
                  >
                    <View style={styles.workspaceRow}>
                      <View
                        style={[
                          styles.workspaceIconBox,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primaryBorder,
                          },
                        ]}
                      >
                        <Ionicons name={iconName} size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="heading3">{t(roleKey)}</AppText>
                        {subtitle ? (
                          <AppText variant="caption" style={{ color: colors.textSecondary }}>
                            {subtitle}
                          </AppText>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.enterCircle,
                          { backgroundColor: colors.inputBackground },
                        ]}
                      >
                        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="caption" style={{ color: colors.textSecondary }}>
                  {t('profile.workspacesSubtitle')}
                </AppText>
                <Button
                  variant="secondary"
                  label={t('profile.devSeedButton')}
                  onPress={handleSeedWorkspaces}
                  loading={seeding}
                />
              </View>
            </Card>
          )}
        </View>

        {/* Appearance & Language Preferences */}
        <View style={styles.sectionBlock}>
          <SectionHeader title={t('profile.preferences')} />
          <Card>
            <View style={styles.prefGroup}>
              <AppText variant="label" style={{ color: colors.textSecondary }}>
                {t('profile.theme')}
              </AppText>
              <View style={styles.themeGrid}>
                {THEMES.map(({ key: th, icon }) => {
                  const selected = th === theme;
                  const labelKey = `profile.theme.${th}` as TranslationKey;
                  return (
                    <Pressable
                      key={th}
                      onPress={() => handleThemeChange(th)}
                      style={[
                        styles.themeTile,
                        {
                          backgroundColor: selected
                            ? colors.primaryLight
                            : colors.inputBackground,
                          borderColor: selected ? colors.primary : colors.border,
                          borderWidth: selected ? 1.5 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={20}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <AppText
                        variant="label"
                        style={{
                          color: selected ? colors.primary : colors.text,
                          fontWeight: selected ? '700' : '600',
                        }}
                      >
                        {t(labelKey)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Divider spacingVertical="md" />

            <View style={styles.prefGroup}>
              <AppText variant="label" style={{ color: colors.textSecondary }}>
                {t('profile.language')}
              </AppText>
              <View style={styles.themeGrid}>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const selected = lang === language;
                  const labelKey = `language.${lang}` as TranslationKey;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => handleLanguageChange(lang)}
                      style={[
                        styles.langTile,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.inputBackground,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="label"
                        style={{
                          color: selected ? colors.onPrimary : colors.text,
                          fontWeight: '700',
                        }}
                      >
                        {t(labelKey)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>

        {/* Barber Invite Code Redemption */}
        <View style={styles.sectionBlock}>
          <SectionHeader title={t('barber.acceptInviteTitle')} />
          <Card>
            <View style={{ gap: spacing.md }}>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                {t('barber.acceptInviteSubtitle')}
              </AppText>
              <TextField
                placeholder="e.g. A1B2C3"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={setInviteCode}
                leftIcon={<Ionicons name="key-outline" size={18} color={colors.textMuted} />}
              />
              <Button
                variant="secondary"
                label={t('barber.acceptCode')}
                onPress={handleAcceptInvite}
                loading={accepting}
                disabled={!inviteCode.trim()}
              />
            </View>
          </Card>
        </View>

        <View style={styles.signOutWrap}>
          <Button
            variant="danger"
            label={t('profile.signOut')}
            onPress={() => setSignOutDialogOpen(true)}
          />
        </View>
      </ScrollView>

      {/* Edit Name BottomSheet */}
      <BottomSheet
        visible={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        title={t('profile.editName')}
        footer={
          <Button
            label={t('common.save')}
            onPress={handleSaveName}
            loading={savingName}
            disabled={!draftName.trim()}
          />
        }
      >
        <Input
          label={t('name.label')}
          placeholder={t('name.placeholder')}
          value={draftName}
          onChangeText={setDraftName}
          autoFocus
        />
      </BottomSheet>

      {/* Sign Out Confirmation */}
      <ConfirmationDialog
        visible={signOutDialogOpen}
        title={t('profile.signOutConfirmTitle')}
        description={t('profile.signOutConfirmDesc')}
        confirmLabel={t('profile.signOut')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        icon="log-out-outline"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutDialogOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    padding: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionBlock: {
    gap: spacing.sm + 2,
  },
  stackSm: {
    gap: spacing.sm + 2,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workspaceIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefGroup: {
    gap: spacing.sm,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  langTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  signOutWrap: {
    marginTop: spacing.xs,
  },
});

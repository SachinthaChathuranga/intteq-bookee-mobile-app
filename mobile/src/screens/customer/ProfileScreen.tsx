import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { fetchMe, logout, seedWorkspacesDev, updateMe } from '../../api/auth';
import { acceptInvite } from '../../api/owner';
import { AppText } from '../../components/AppText';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useT } from '../../i18n';
import { useAuthStore, type StaffRole, type UserRole } from '../../store/authStore';
import { useSettingsStore, type Language, type ThemePreference } from '../../store/settingsStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTheme } from '../../theme/ThemeProvider';

const LANGUAGES: Language[] = ['en', 'si', 'ta'];
const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export function ProfileScreen() {
  const t = useT();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const setRoles = useAuthStore((s) => s.setRoles);
  const language = useSettingsStore((s) => s.language);
  const theme = useSettingsStore((s) => s.theme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [devStatus, setDevStatus] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const redeemInviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteCode.trim() || inviteCode.trim().length !== 6) {
        throw new Error('Please enter a 6-character invite code');
      }
      return await acceptInvite(inviteCode.trim().toUpperCase());
    },
    onSuccess: async (data) => {
      setInviteCode('');
      setInviteError(null);
      const me = await fetchMe();
      setRoles(me.roles);
      Alert.alert(t('common.done'), `${t('barber.joinedSuccess')}\n(${data.business_name} - ${data.branch_name})`);
    },
    onError: (err: any) => {
      setInviteError(err?.code ? t(`common.error.${err.code}` as any) || err.code : err.message || t('common.error.generic'));
    },
  });

  const syncSettings = useMutation({
    mutationFn: (patch: { language?: Language; theme?: ThemePreference }) => updateMe(patch),
    onSuccess: ({ user: updatedUser }) => {
      useAuthStore.getState().setUser(updatedUser);
    },
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    syncSettings.mutate({ language: lang });
  };

  const handleThemeChange = (pref: ThemePreference) => {
    setTheme(pref);
    syncSettings.mutate({ theme: pref });
  };

  const seedDev = useMutation({
    mutationFn: () => seedWorkspacesDev(),
    onSuccess: (res) => {
      setRoles(res.roles);
      setDevStatus(t('profile.devSeedSuccess'));
    },
    onError: () => {
      Alert.alert('Error', t('common.error.generic'));
    },
  });

  const signOut = async () => {
    const token = useAuthStore.getState().refreshToken;
    if (token) await logout(token).catch(() => undefined);
    useWorkspaceStore.getState().clearWorkspace();
    await useAuthStore.getState().signOut();
  };

  const formatRoleTitle = (item: UserRole) => {
    const roleLabel = t(`role.${item.role}`);
    if (item.business_name) {
      return `${roleLabel} — ${item.business_name}`;
    }
    return roleLabel;
  };

  return (
    <Screen>
      <AppText variant="title">{t('profile.title')}</AppText>

      {/* Account Info */}
      <Card>
        <AppText variant="body" style={{ fontWeight: '700' }}>
          {t('profile.accountDetails')}
        </AppText>
        <View style={styles.row}>
          <AppText variant="caption">{t('name.label')}:</AppText>
          <AppText variant="body" style={{ fontWeight: '600' }}>
            {user?.name ?? '—'}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="caption">{t('profile.phone')}:</AppText>
          <AppText variant="body">{user?.phone ?? '—'}</AppText>
        </View>
      </Card>

      {/* Staff Workspaces Section (SPEC §3.1: Only shown if staff roles exist) */}
      {roles.length > 0 && (
        <View style={styles.section}>
          <AppText variant="body" style={{ fontWeight: '700' }}>
            {t('profile.workspaces')}
          </AppText>
          <AppText variant="caption">{t('profile.workspacesSubtitle')}</AppText>

          <View style={{ gap: 10, marginTop: 4 }}>
            {roles.map((roleItem) => (
              <Card
                key={roleItem.id}
                onPress={() => setActiveWorkspace(roleItem)}
                style={styles.workspaceCard}
              >
                <View style={styles.workspaceRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="body" style={{ fontWeight: '600' }}>
                      {formatRoleTitle(roleItem)}
                    </AppText>
                    <Badge
                      label={t(`role.${roleItem.role}`)}
                      variant={
                        roleItem.role === 'OWNER'
                          ? 'primary'
                          : roleItem.role === 'BARBER'
                          ? 'success'
                          : 'warning'
                      }
                    />
                  </View>
                  <AppText style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                    →
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Redeem Barber Invite */}
      <Card>
        <AppText variant="body" style={{ fontWeight: '700' }}>
          {t('barber.acceptInviteTitle')}
        </AppText>
        <AppText variant="caption">{t('barber.acceptInviteSubtitle')}</AppText>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <TextField
              label=""
              placeholder="e.g. A1B2C3"
              autoCapitalize="characters"
              maxLength={6}
              value={inviteCode}
              onChangeText={(txt) => {
                setInviteCode(txt.toUpperCase());
                setInviteError(null);
              }}
              error={inviteError}
            />
          </View>
          <View style={{ paddingTop: 6 }}>
            <Button
              label={t('barber.acceptCode')}
              onPress={() => redeemInviteMutation.mutate()}
              loading={redeemInviteMutation.isPending}
            />
          </View>
        </View>
      </Card>

      {/* Preferences: Language */}
      <View style={styles.section}>
        <AppText variant="body" style={{ fontWeight: '700' }}>
          {t('profile.language')}
        </AppText>
        <View style={styles.buttonRow}>
          {LANGUAGES.map((lang) => (
            <View key={lang} style={{ flex: 1 }}>
              <Button
                label={t(`language.${lang}`)}
                variant={language === lang ? 'primary' : 'secondary'}
                onPress={() => handleLanguageChange(lang)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Preferences: Theme */}
      <View style={styles.section}>
        <AppText variant="body" style={{ fontWeight: '700' }}>
          {t('profile.theme')}
        </AppText>
        <View style={styles.buttonRow}>
          {THEMES.map((themeMode) => (
            <View key={themeMode} style={{ flex: 1 }}>
              <Button
                label={t(`profile.theme.${themeMode}`)}
                variant={theme === themeMode ? 'primary' : 'secondary'}
                onPress={() => handleThemeChange(themeMode)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Dev Seeder Button for quick testing */}
      <Card style={{ marginTop: 8 }}>
        <Button
          variant="secondary"
          label={t('profile.devSeedButton')}
          onPress={() => {
            setDevStatus(null);
            seedDev.mutate();
          }}
          loading={seedDev.isPending}
        />
        {devStatus ? (
          <AppText variant="caption" style={{ color: colors.success, textAlign: 'center' }}>
            {devStatus}
          </AppText>
        ) : null}
      </Card>

      {/* Sign Out */}
      <View style={{ marginTop: 8 }}>
        <Button variant="secondary" label={t('profile.signOut')} onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  workspaceCard: {
    paddingVertical: 14,
  },
  workspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

// Source of truth for translation keys. si.ts and ta.ts are typed against this file.
export const en = {
  'term.salon': 'Salon',
  'term.barber': 'Barber',

  'app.loading': 'Loading…',
  'common.continue': 'Continue',
  'common.error.generic': 'Something went wrong. Please try again.',
  'common.error.network': 'Cannot reach the server. Check your connection.',

  'language.title': 'Choose your language',
  'language.subtitle': 'You can change this later in your profile.',
  'language.en': 'English',
  'language.si': 'සිංහල',
  'language.ta': 'தமிழ்',

  'login.title': 'Welcome to {appName}',
  'login.subtitle': 'Enter your mobile number to continue.',
  'login.phoneLabel': 'Mobile number',
  'login.phonePlaceholder': '07X XXX XXXX',
  'login.sendCode': 'Send code',
  'login.invalidPhone': 'Enter a valid Sri Lankan mobile number.',

  'otp.title': 'Enter the code',
  'otp.subtitle': 'We sent a 6-digit code to {phone}.',
  'otp.codeLabel': 'Verification code',
  'otp.verify': 'Verify',
  'otp.invalid': 'That code is incorrect or has expired.',
  'otp.resend': 'Resend code',
  'otp.resendIn': 'Resend in {seconds}s',
  'otp.cooldown': 'Please wait a minute before requesting another code.',
  'otp.changeNumber': 'Change number',

  'name.title': 'What should we call you?',
  'name.subtitle': 'Your name is shown when you book or join a queue.',
  'name.label': 'Your name',
  'name.placeholder': 'Full name',

  'home.title': 'Home',
  'home.welcome': 'Hi, {name}!',
  'home.placeholder': 'Find a {salon} and join the queue — coming soon.',
  'home.signOut': 'Sign out',

  // Customer Navigation Tabs
  'nav.home': 'Home',
  'nav.explore': 'Explore',
  'nav.appointments': 'Appointments',
  'nav.profile': 'Profile',

  // Explore & Appointments
  'explore.title': 'Explore Salons',
  'explore.placeholder': 'Search salons by name or location — coming in Milestone 6',
  'appointments.title': 'My Appointments',
  'appointments.placeholder': 'Your upcoming and past bookings — coming in Milestone 7',

  // Profile Screen
  'profile.title': 'Profile',
  'profile.accountDetails': 'Account Details',
  'profile.phone': 'Phone number',
  'profile.preferences': 'Preferences',
  'profile.language': 'Language',
  'profile.theme': 'Theme',
  'profile.theme.light': 'Light',
  'profile.theme.dark': 'Dark',
  'profile.theme.system': 'System',
  'profile.workspaces': 'My Workspaces',
  'profile.workspacesSubtitle': 'Switch to staff and administrative dashboards',
  'profile.devSeedButton': 'Dev: Seed staff workspaces',
  'profile.devSeedSuccess': 'Workspaces seeded! Pull to refresh or check below.',
  'profile.signOut': 'Sign out',

  // Roles
  'role.SUPER_ADMIN': 'Super Admin',
  'role.OWNER': 'Owner',
  'role.BARBER': 'Barber',
  'role.RECEPTIONIST': 'Receptionist',

  // Workspaces
  'workspace.backToCustomer': 'Back to customer app',
  'workspace.activeBanner': 'Staff Workspace',
  'workspace.owner.title': 'Owner Dashboard',
  'workspace.owner.placeholder': 'Salon income, branches, and staff overview — available in Milestone 3',
  'workspace.barber.title': 'Barber Queue',
  'workspace.barber.placeholder': 'Shift controls and customer queue — available in Milestone 4',
  'workspace.receptionist.title': 'Reception Queue',
  'workspace.receptionist.placeholder': 'Branch queue and walk-in check-in — available in Milestone 5',
  'workspace.admin.title': 'Super Admin Dashboard',
  'workspace.admin.placeholder': 'Business accounts management — available in Milestone 11',
};

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

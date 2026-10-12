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
};

export type TranslationKey = keyof typeof en;
export type Translations = Record<TranslationKey, string>;

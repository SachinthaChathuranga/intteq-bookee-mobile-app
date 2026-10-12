import type { Translations } from './en';

export const ta: Translations = {
  'term.salon': 'சலூன்',
  'term.barber': 'பார்பர்',

  'app.loading': 'ஏற்றுகிறது…',
  'common.continue': 'தொடரவும்',
  'common.error.generic': 'ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.',
  'common.error.network': 'சேவையகத்தை அடைய முடியவில்லை. உங்கள் இணைப்பைச் சரிபார்க்கவும்.',

  'language.title': 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
  'language.subtitle': 'இதை பின்னர் உங்கள் சுயவிவரத்தில் மாற்றலாம்.',
  'language.en': 'English',
  'language.si': 'සිංහල',
  'language.ta': 'தமிழ்',

  'login.title': '{appName}-க்கு வரவேற்கிறோம்',
  'login.subtitle': 'தொடர உங்கள் மொபைல் எண்ணை உள்ளிடவும்.',
  'login.phoneLabel': 'மொபைல் எண்',
  'login.phonePlaceholder': '07X XXX XXXX',
  'login.sendCode': 'குறியீட்டை அனுப்பு',
  'login.invalidPhone': 'சரியான இலங்கை மொபைல் எண்ணை உள்ளிடவும்.',

  'otp.title': 'குறியீட்டை உள்ளிடவும்',
  'otp.subtitle': '{phone} எண்ணுக்கு 6 இலக்கக் குறியீடு அனுப்பப்பட்டது.',
  'otp.codeLabel': 'சரிபார்ப்புக் குறியீடு',
  'otp.verify': 'சரிபார்',
  'otp.invalid': 'அந்தக் குறியீடு தவறானது அல்லது காலாவதியானது.',
  'otp.resend': 'குறியீட்டை மீண்டும் அனுப்பு',
  'otp.resendIn': '{seconds} விநாடிகளில் மீண்டும் அனுப்பலாம்',
  'otp.cooldown': 'மற்றொரு குறியீட்டைக் கோருவதற்கு முன் ஒரு நிமிடம் காத்திருக்கவும்.',
  'otp.changeNumber': 'எண்ணை மாற்று',

  'name.title': 'உங்களை எப்படி அழைக்கலாம்?',
  'name.subtitle': 'நீங்கள் முன்பதிவு செய்யும்போது அல்லது வரிசையில் சேரும்போது உங்கள் பெயர் காட்டப்படும்.',
  'name.label': 'உங்கள் பெயர்',
  'name.placeholder': 'முழுப் பெயர்',

  'home.title': 'முகப்பு',
  'home.welcome': 'வணக்கம், {name}!',
  'home.placeholder': '{salon} ஒன்றைத் தேடி வரிசையில் சேருங்கள் — விரைவில்.',
  'home.signOut': 'வெளியேறு',

  // Customer Navigation Tabs
  'nav.home': 'முகப்பு',
  'nav.explore': 'தேடுக',
  'nav.appointments': 'முன்பதிவுகள்',
  'nav.profile': 'சுயவிவரம்',

  // Explore & Appointments
  'explore.title': 'சலூன்களைத் தேடுங்கள்',
  'explore.placeholder': 'பெயர் அல்லது இருப்பிடத்தின்படி சலூன்களைத் தேடுங்கள் — மைல்கல் 6 இல் வரும்',
  'appointments.title': 'எனது முன்பதிவுகள்',
  'appointments.placeholder': 'உங்கள் வரவிருக்கும் மற்றும் கடந்தகால முன்பதிவுகள் — மைல்கல் 7 இல் வரும்',

  // Profile Screen
  'profile.title': 'சுயவிவரம்',
  'profile.accountDetails': 'கணக்கு விவரங்கள்',
  'profile.phone': 'தொலைபேசி எண்',
  'profile.preferences': 'விருப்பத்தேர்வுகள்',
  'profile.language': 'மொழி',
  'profile.theme': 'தீம்',
  'profile.theme.light': 'வெளிர்',
  'profile.theme.dark': 'இருண்ட',
  'profile.theme.system': 'சாதன முறை',
  'profile.workspaces': 'எனது பணியிடங்கள்',
  'profile.workspacesSubtitle': 'பணியாளர் மற்றும் நிர்வாக பலகைகளுக்கு மாறவும்',
  'profile.devSeedButton': 'Dev: பணியிடங்களை உருவாக்கு',
  'profile.devSeedSuccess': 'பணியிடங்கள் உருவாக்கப்பட்டன!',
  'profile.signOut': 'வெளியேறு',

  // Roles
  'role.SUPER_ADMIN': 'முதன்மை நிர்வாகி',
  'role.OWNER': 'உரிமையாளர்',
  'role.BARBER': 'பார்பர்',
  'role.RECEPTIONIST': 'வரவேற்பாளர்',

  // Workspaces
  'workspace.backToCustomer': 'வாடிக்கையாளர் செயலிக்குத் திரும்பு',
  'workspace.activeBanner': 'பணியாளர் பணியிடம்',
  'workspace.owner.title': 'உரிமையாளர் பலகை',
  'workspace.owner.placeholder': 'சலூன் வருமானம், கிளைகள் மற்றும் பணியாளர் விவரங்கள் — மைல்கல் 3 இல் கிடைக்கும்',
  'workspace.barber.title': 'பார்பர் வரிசை',
  'workspace.barber.placeholder': 'ஷிப்ட் கட்டுப்பாடுகள் மற்றும் வாடிக்கையாளர் வரிசை — மைல்கல் 4 இல் கிடைக்கும்',
  'workspace.receptionist.title': 'வரவேற்பு வரிசை',
  'workspace.receptionist.placeholder': 'கிளை வரிசை மற்றும் நேரடி பதிவுகள் — மைல்கல் 5 இல் கிடைக்கும்',
  'workspace.admin.title': 'முதன்மை நிர்வாக பலகை',
  'workspace.admin.placeholder': 'வணிகக் கணக்குகள் மேலாண்மை — மைல்கல் 11 இல் கிடைக்கும்',
};

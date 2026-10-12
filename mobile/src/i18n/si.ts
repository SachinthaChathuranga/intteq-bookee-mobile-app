import type { Translations } from './en';

export const si: Translations = {
  'term.salon': 'සැලූන්',
  'term.barber': 'බාබර්',

  'app.loading': 'පූරණය වෙමින්…',
  'common.continue': 'ඉදිරියට',
  'common.error.generic': 'යම් දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.',
  'common.error.network': 'සේවාදායකයට සම්බන්ධ විය නොහැක. ඔබේ සම්බන්ධතාව පරීක්ෂා කරන්න.',

  'language.title': 'ඔබේ භාෂාව තෝරන්න',
  'language.subtitle': 'මෙය පසුව ඔබේ පැතිකඩෙන් වෙනස් කළ හැක.',
  'language.en': 'English',
  'language.si': 'සිංහල',
  'language.ta': 'தமிழ்',

  'login.title': '{appName} වෙත සාදරයෙන් පිළිගනිමු',
  'login.subtitle': 'ඉදිරියට යාමට ඔබේ ජංගම දුරකථන අංකය ඇතුළත් කරන්න.',
  'login.phoneLabel': 'ජංගම දුරකථන අංකය',
  'login.phonePlaceholder': '07X XXX XXXX',
  'login.sendCode': 'කේතය යවන්න',
  'login.invalidPhone': 'වලංගු ශ්‍රී ලංකා ජංගම අංකයක් ඇතුළත් කරන්න.',

  'otp.title': 'කේතය ඇතුළත් කරන්න',
  'otp.subtitle': '{phone} වෙත ඉලක්කම් 6ක කේතයක් එවන ලදී.',
  'otp.codeLabel': 'සත්‍යාපන කේතය',
  'otp.verify': 'තහවුරු කරන්න',
  'otp.invalid': 'එම කේතය වැරදියි හෝ කල් ඉකුත් වී ඇත.',
  'otp.resend': 'කේතය නැවත යවන්න',
  'otp.resendIn': 'තත්පර {seconds}කින් නැවත යවන්න',
  'otp.cooldown': 'තවත් කේතයක් ඉල්ලීමට පෙර කරුණාකර විනාඩියක් රැඳී සිටින්න.',
  'otp.changeNumber': 'අංකය වෙනස් කරන්න',

  'name.title': 'අපි ඔබට කුමක් කියා කතා කරමුද?',
  'name.subtitle': 'ඔබ වෙන්කරවා ගන්නා විට හෝ පෝලිමට එක් වන විට ඔබේ නම පෙන්වයි.',
  'name.label': 'ඔබේ නම',
  'name.placeholder': 'සම්පූර්ණ නම',

  'home.title': 'මුල් පිටුව',
  'home.welcome': 'ආයුබෝවන්, {name}!',
  'home.placeholder': '{salon} එකක් සොයා පෝලිමට එක් වන්න — ඉක්මනින් එනවා.',
  'home.signOut': 'ඉවත් වන්න',

  // Customer Navigation Tabs
  'nav.home': 'මුල් පිටුව',
  'nav.explore': 'සොයන්න',
  'nav.appointments': 'වෙන්කිරීම්',
  'nav.profile': 'පැතිකඩ',

  // Explore & Appointments
  'explore.title': 'සැලූන් සොයන්න',
  'explore.placeholder': 'නම හෝ ස්ථානය අනුව සැලූන් සොයන්න — 6 වන පියවරෙන් පැමිණේ',
  'appointments.title': 'මගේ වෙන්කිරීම්',
  'appointments.placeholder': 'ඔබේ ඉදිරි සහ පසුගිය වෙන්කිරීම් — 7 වන පියවරෙන් පැමිණේ',

  // Profile Screen
  'profile.title': 'පැතිකඩ',
  'profile.accountDetails': 'ගිණුම් විස්තර',
  'profile.phone': 'දුරකථන අංකය',
  'profile.preferences': 'මනාපයන්',
  'profile.language': 'භාෂාව',
  'profile.theme': 'තේමාව',
  'profile.theme.light': 'ලා පැහැ',
  'profile.theme.dark': 'අඳුරු පැහැ',
  'profile.theme.system': 'පද්ධතිය අනුව',
  'profile.workspaces': 'මගේ කාර්යාල',
  'profile.workspacesSubtitle': 'කාර්ය මණ්ඩල පුවරු වෙත මාරු වන්න',
  'profile.devSeedButton': 'Dev: කාර්යාල සාදන්න',
  'profile.devSeedSuccess': 'කාර්යාල සාර්ථකව සාදන ලදී!',
  'profile.signOut': 'ඉවත් වන්න',

  // Roles
  'role.SUPER_ADMIN': 'ප්‍රධාන පරිපාලක',
  'role.OWNER': 'හිමිකරු',
  'role.BARBER': 'බාබර්',
  'role.RECEPTIONIST': 'පිළිගැනීමේ නිලධාරී',

  // Workspaces
  'workspace.backToCustomer': 'පාරිභෝගික යෙදුම වෙත ආපසු',
  'workspace.activeBanner': 'කාර්ය මණ්ඩල කාර්යාලය',
  'workspace.owner.title': 'හිමිකරු පුවරුව',
  'workspace.owner.placeholder': 'සැලූන් ආදායම, ශාඛා සහ සේවක විස්තර — 3 වන පියවරෙන් ලැබේ',
  'workspace.barber.title': 'බාබර් පෝලිම',
  'workspace.barber.placeholder': 'වැඩ මුරය සහ පාරිභෝගික පෝලිම — 4 වන පියවරෙන් ලැබේ',
  'workspace.receptionist.title': 'පිළිගැනීමේ පෝලිම',
  'workspace.receptionist.placeholder': 'ශාඛා පෝලිම සහ සෘජු ඇතුළත්වීම් — 5 වන පියවරෙන් ලැබේ',
  'workspace.admin.title': 'ප්‍රධාන පරිපාලක පුවරුව',
  'workspace.admin.placeholder': 'ව්‍යාපාර ගිණුම් කළමනාකරණය — 11 වන පියවරෙන් ලැබේ',
};

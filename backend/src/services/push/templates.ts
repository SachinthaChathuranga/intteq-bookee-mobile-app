export type SupportedLanguage = 'en' | 'si' | 'ta';

export interface LocalizedNotification {
  title: string;
  body: string;
}

export type NotificationEventKey =
  | 'queue_one_ahead'
  | 'queue_next'
  | 'general_queue_picked_up'
  | 'queue_reassigned'
  | 'shift_ending_request_cancel'
  | 'appointment_confirmed'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'favourite_barber_shift_started';

export interface NotificationParams {
  barberName?: string;
  salonName?: string;
  date?: string;
  time?: string;
}

const templates: Record<
  NotificationEventKey,
  Record<SupportedLanguage, (p: NotificationParams) => LocalizedNotification>
> = {
  queue_one_ahead: {
    en: () => ({
      title: 'Your turn is coming up',
      body: 'Only 1 person ahead of you in line',
    }),
    si: () => ({
      title: 'ඔබේ වාරය ළඟා වෙමින් පවතී',
      body: 'ඔබට ඉදිරියෙන් සිටින්නේ 1 අයෙකු පමණි',
    }),
    ta: () => ({
      title: 'உங்கள் முறை வரவிருக்கிறது',
      body: 'உங்களுக்கு முன்னால் 1 நபர் மட்டுமே உள்ளார்',
    }),
  },

  queue_next: {
    en: () => ({
      title: 'You are next!',
      body: 'Please make your way to the salon',
    }),
    si: () => ({
      title: 'ඔබ ඊළඟට!',
      body: 'කරුණාකර සැලූන් එක වෙත පැමිණෙන්න',
    }),
    ta: () => ({
      title: 'அடுத்து நீங்கள் தான்!',
      body: 'தயவுசெய்து சலூனுக்கு வரவும்',
    }),
  },

  general_queue_picked_up: {
    en: (p) => ({
      title: 'Barber Assigned',
      body: `Barber ${p.barberName || 'your barber'} will serve you`,
    }),
    si: (p) => ({
      title: 'බාබර්වරයෙකු පැවරුණි',
      body: `බාබර් ${p.barberName || 'ඔබගේ බාබර්'} ඔබට සේවය කරනු ඇත`,
    }),
    ta: (p) => ({
      title: 'பார்பர் நியமிக்கப்பட்டார்',
      body: `பார்பர் ${p.barberName || 'உங்கள் பார்பர்'} உங்களுக்கு சேவை செய்வார்`,
    }),
  },

  queue_reassigned: {
    en: (p) => ({
      title: 'Queue Updated',
      body: `You've been moved to Barber ${p.barberName || 'another barber'}'s queue`,
    }),
    si: (p) => ({
      title: 'පෝලිම යාවත්කාලීන විය',
      body: `ඔබව බාබර් ${p.barberName || 'වෙනත් බාබර්'} ගේ පෝලිමට මාරු කර ඇත`,
    }),
    ta: (p) => ({
      title: 'வரிசை புதுப்பிக்கப்பட்டது',
      body: `நீங்கள் பார்பர் ${p.barberName || 'மற்றொரு பார்பர்'}-இன் வரிசைக்கு மாற்றப்பட்டுள்ளீர்கள்`,
    }),
  },

  shift_ending_request_cancel: {
    en: (p) => ({
      title: 'Shift Ending',
      body: `Barber ${p.barberName || 'your barber'} is ending their shift. Please cancel your booking or move to another barber.`,
    }),
    si: (p) => ({
      title: 'වැඩ මුරය අවසන් වේ',
      body: `බාබර් ${p.barberName || 'ඔබගේ බාබර්'} වැඩ මුරය අවසන් කරයි. කරුණාකර අවලංගු කරන්න හෝ වෙනත් බාබර්වරයෙකු තෝරන්න.`,
    }),
    ta: (p) => ({
      title: 'பணி நேரம் முடிவடைகிறது',
      body: `பார்பர் ${p.barberName || 'உங்கள் பார்பர்'} தனது பணியை முடிக்கிறார். முன்பதிவை ரத்துசெய்யவும் அல்லது வேறு பார்பரைத் தேர்ந்தெடுக்கவும்.`,
    }),
  },

  appointment_confirmed: {
    en: (p) => ({
      title: 'Appointment Confirmed',
      body: `Appointment confirmed with ${p.barberName || 'Barber'} on ${p.date || 'date'} at ${p.time || 'time'}`,
    }),
    si: (p) => ({
      title: 'වෙන්කිරීම තහවුරු විය',
      body: `${p.date || 'දිනය'} දින ${p.time || 'වේලාව'} ට බාබර් ${p.barberName || ''} සමඟ වේලාව තහවුරු විය`,
    }),
    ta: (p) => ({
      title: 'முன்பதிவு உறுதிப்படுத்தப்பட்டது',
      body: `${p.date || 'தேதி'} அன்று ${p.time || 'நேரம்'} மணிக்கு பார்பர் ${p.barberName || ''} உடன் முன்பதிவு உறுதி செய்யப்பட்டது`,
    }),
  },

  appointment_rescheduled: {
    en: (p) => ({
      title: 'Appointment Rescheduled',
      body: `Appointment rescheduled to ${p.date || 'date'} at ${p.time || 'time'}`,
    }),
    si: (p) => ({
      title: 'වෙන්කිරීම වෙනස් විය',
      body: `නව වේලාව ${p.date || 'දිනය'} දින ${p.time || 'වේලාව'} වේ`,
    }),
    ta: (p) => ({
      title: 'முன்பதிவு மாற்றியமைக்கப்பட்டது',
      body: `புதிய நேரம் ${p.date || 'தேதி'} அன்று ${p.time || 'நேரம்'} மணி`,
    }),
  },

  appointment_cancelled: {
    en: (p) => ({
      title: 'Appointment Cancelled',
      body: `Appointment on ${p.date || 'date'} at ${p.time || 'time'} has been cancelled`,
    }),
    si: (p) => ({
      title: 'වෙන්කිරීම අවලංගු විය',
      body: `${p.date || 'දිනය'} දින ${p.time || 'වේලාව'} ට තිබූ වෙන්කිරීම අවලංගු කර ඇත`,
    }),
    ta: (p) => ({
      title: 'முன்பதிவு ரத்து செய்யப்பட்டது',
      body: `${p.date || 'தேதி'} அன்று ${p.time || 'நேரம்'} முன்பதிவு ரத்து செய்யப்பட்டுள்ளது`,
    }),
  },

  appointment_reminder: {
    en: (p) => ({
      title: 'Upcoming Appointment',
      body: `Reminder: You have an appointment with ${p.barberName || 'your barber'} in 1 hour (${p.time || ''})`,
    }),
    si: (p) => ({
      title: 'ඉදිරි වෙන්කිරීම',
      body: `මතක් කිරීම: පැය 1කින් (${p.time || ''} ට) බාබර් ${p.barberName || ''} සමඟ ඔබේ වෙන්කිරීම ඇත`,
    }),
    ta: (p) => ({
      title: 'வரவிருக்கும் முன்பதிவு',
      body: `நினைவூட்டல்: 1 மணி நேரத்தில் (${p.time || ''}) பார்பர் ${p.barberName || ''} உடன் உங்களுக்கு முன்பதிவு உள்ளது`,
    }),
  },

  favourite_barber_shift_started: {
    en: (p) => ({
      title: 'Barber on Shift',
      body: `Your favourite barber ${p.barberName || 'Kasun'} is now on shift!`,
    }),
    si: (p) => ({
      title: 'බාබර් සේවයට පැමිණ ඇත',
      body: `ඔබ ප්‍රියකරන බාබර් ${p.barberName || ''} දැන් වැඩ ආරම්භ කර ඇත!`,
    }),
    ta: (p) => ({
      title: 'பார்பர் பணியில் உள்ளார்',
      body: `உங்களுக்குப் பிடித்த பார்பர் ${p.barberName || ''} இப்போது பணியைத் தொடங்கியுள்ளார்!`,
    }),
  },
};

export function getNotificationText(
  event: NotificationEventKey,
  lang: string | null | undefined,
  params: NotificationParams = {},
): LocalizedNotification {
  const normalizedLang: SupportedLanguage =
    lang === 'si' || lang === 'ta' || lang === 'en' ? lang : 'en';
  const generator = templates[event][normalizedLang] || templates[event].en;
  return generator(params);
}

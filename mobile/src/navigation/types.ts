export type CustomerTabParamList = {
  Home: undefined;
  Explore: undefined;
  Appointments: undefined;
  Profile: undefined;
};

export type OwnerStackParamList = {
  OwnerHome: undefined;
};

export type BarberStackParamList = {
  BarberHome: undefined;
};

export type ReceptionistStackParamList = {
  ReceptionistHome: undefined;
};

export type AdminStackParamList = {
  AdminHome: undefined;
};

export type RootStackParamList = {
  LanguageSelect: undefined;
  PhoneLogin: undefined;
  Otp: { phone: string };
  Name: undefined;
  CustomerApp: undefined;
  OwnerApp: undefined;
  BarberApp: undefined;
  ReceptionistApp: undefined;
  AdminApp: undefined;
};

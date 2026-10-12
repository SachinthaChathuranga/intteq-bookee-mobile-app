export type CustomerTabParamList = {
  Home: undefined;
  Explore: undefined;
  Appointments: undefined;
  Profile: undefined;
};

export type OwnerStackParamList = {
  OwnerHome: undefined;
  BranchList: undefined;
  BranchEdit: { branchId?: string };
  ServiceList: undefined;
  ServiceEdit: { serviceId?: string; branchId: string };
  BarberList: undefined;
  InviteBarber: { branchId: string };
};

export type BarberStackParamList = {
  BarberHome: undefined;
  EndShift: { branchId: string; shiftId: string };
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

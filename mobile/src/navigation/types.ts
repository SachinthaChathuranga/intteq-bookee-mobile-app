export type CustomerTabParamList = {
  Home: undefined;
  Explore: undefined;
  Appointments: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: { screen?: keyof CustomerTabParamList } | undefined;
  Booking: {
    branchId?: string;
    preselectedBarberId?: string;
    initialStep?: 1 | 2;
  };
};

export type OwnerTabParamList = {
  OwnerHome: undefined;
  BranchList: undefined;
  ServiceList: undefined;
  BarberList: undefined;
  ExitWorkspace?: undefined;
};

export type OwnerStackParamList = {
  OwnerTabs: undefined;
  OwnerHome: undefined;
  BranchList: undefined;
  BranchEdit: { branchId?: string };
  ServiceList: undefined;
  ServiceEdit: { serviceId?: string; branchId: string };
  BarberList: undefined;
  InviteBarber: { branchId: string };
  ExitWorkspace?: undefined;
};


export type BarberStackParamList = {
  BarberHome: undefined;
  EndShift: { branchId?: string; shiftId?: string };
  AddWalkIn: { branchId?: string; preselectedBarberId?: string };
  ExitWorkspace?: undefined;
};

export type ReceptionistStackParamList = {
  ReceptionistHome: undefined;
  AddWalkIn: { branchId?: string; preselectedBarberId?: string };
  ExitWorkspace?: undefined;
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

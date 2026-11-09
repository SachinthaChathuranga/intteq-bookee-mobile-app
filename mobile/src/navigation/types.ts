import type { QueueEntry, ShiftSummary } from '../api/barber';
import type { SalonSearchWorkingHour } from '../api/customer';

export type CustomerTabParamList = {
  HomeTab: undefined;
  ExploreTab: { initialQuery?: string } | undefined;
  AppointmentsTab: undefined;
  ProfileTab: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: { screen?: keyof CustomerTabParamList; params?: unknown } | undefined;
  Booking: {
    branchId?: string;
    branchName?: string;
    businessName?: string;
    address?: string;
    phone?: string | null;
    workingHours?: SalonSearchWorkingHour[];
    preselectedBarberId?: string;
    preselectedBarberName?: string;
    initialStep?: 1 | 2;
  };
  CustomerWait: undefined;
};

export type OwnerTabParamList = {
  OverviewTab: undefined;
  LiveFloorTab: undefined;
  BranchesTab: undefined;
  ServicesTab: undefined;
  BarbersTab: undefined;
  ExitTab: undefined;
};

export type OwnerStackParamList = {
  OwnerTabs: undefined;
  OwnerHome: undefined;
  LiveFloor: undefined;
  BranchList: undefined;
  BranchEdit: { branchId?: string } | undefined;
  ServiceList: undefined;
  ServiceEdit: { serviceId?: string; branchId: string };
  BarberList: undefined;
  InviteBarber: { branchId: string };
  ExitWorkspace?: undefined;
};

export type BarberTabParamList = {
  QueueTab: undefined;
  AppointmentsTab: undefined;
  ShiftTab: undefined;
  ExitTab: undefined;
};

export type BarberStackParamList = {
  BarberTabs: { screen?: keyof BarberTabParamList } | undefined;
  BarberHome: undefined;
  BarberAppointments: undefined;
  CompleteService: { branchId: string; entry: QueueEntry };
  EndShift: { branchId?: string; shiftId?: string; summary?: ShiftSummary } | undefined;
  AddWalkIn: { branchId?: string; preselectedBarberId?: string } | undefined;
  ExitWorkspace?: undefined;
};

export type ReceptionistTabParamList = {
  FloorTab: undefined;
  WalkInTab: undefined;
  AvailabilityTab: undefined;
  ExitTab: undefined;
};

export type ReceptionistStackParamList = {
  ReceptionistTabs: { screen?: keyof ReceptionistTabParamList } | undefined;
  ReceptionistHome: undefined;
  AddWalkIn: { branchId?: string; preselectedBarberId?: string } | undefined;
  WalkInSuccess: {
    token: string;
    estimatedWaitMinutes: number;
    customerName: string;
  };
  AvailabilityLookup: undefined;
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

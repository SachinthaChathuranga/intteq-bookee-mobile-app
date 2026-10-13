import { apiRequest } from './client';

export interface SalonSearchService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface SalonSearchWorkingHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface SalonSearchResult {
  id: string;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  business_status: string;
  branch_name: string;
  address: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  services: SalonSearchService[];
  working_hours: SalonSearchWorkingHour[];
  active_barbers_count: number;
}

export interface SalonSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

export async function fetchSalons(params: SalonSearchParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set('query', params.query);
  if (params.lat !== undefined) searchParams.set('lat', String(params.lat));
  if (params.lng !== undefined) searchParams.set('lng', String(params.lng));
  if (params.radius_km !== undefined) searchParams.set('radius_km', String(params.radius_km));

  const qs = searchParams.toString();
  const endpoint = `/salon/search${qs ? `?${qs}` : ''}`;

  return await apiRequest<{ salons: SalonSearchResult[] }>(endpoint);
}

export interface BranchService {
  id: string;
  branch_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface BranchBarber {
  id: string;
  name: string | null;
  avatar_url: string | null;
  avg_rating: string;
  rating_count: number;
  is_working_today: boolean;
  offered_service_ids: string[];
}

export interface FeaturedBarber {
  id: string;
  name: string | null;
  avatar_url: string | null;
  avg_rating: string;
  rating_count: number;
  branch_id: string;
  branch_name: string;
  business_name: string;
}

export interface BarberTodayBranch {
  branch_id: string;
  branch_name: string;
  business_name: string;
  is_on_shift_today: boolean;
  address: string;
}

export interface SlotAvailability {
  time: string;
  start_at: string;
  end_at: string;
  available: boolean;
}

export interface BranchAvailabilityResult {
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  total_duration_minutes: number;
  total_price: number;
  now_available: boolean;
  slots: SlotAvailability[];
  candidate_barbers_count: number;
}

export interface CreateAppointmentPayload {
  barberId?: string | null;
  serviceIds: string[];
  startAt: string;
  bookingMode: 'SPECIFIC' | 'ANY';
  notes?: string;
}

export interface AppointmentResult {
  id: string;
  branch_id: string;
  barber_id: string;
  barber_name: string;
  barber_avatar: string | null;
  customer_id: string;
  booking_mode: 'SPECIFIC' | 'ANY';
  start_at: string;
  end_at: string;
  status: string;
  total_price: number;
  total_duration_minutes: number;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
}

export interface QueueJoinResult {
  entry_id: string;
  token: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  estimated_wait_minutes: number;
}

export async function fetchBranchServices(branchId: string) {
  return await apiRequest<{ services: BranchService[] }>(`/salon/branches/${branchId}/services`);
}

export async function fetchBranchBarbers(branchId: string) {
  return await apiRequest<{ barbers: BranchBarber[] }>(`/salon/branches/${branchId}/barbers-list`);
}

export async function fetchBarbers() {
  return await apiRequest<{ barbers: FeaturedBarber[] }>('/salon/barbers');
}

export async function fetchBarberTodayBranch(barberId: string) {
  return await apiRequest<BarberTodayBranch>(`/salon/barbers/${barberId}/today-branch`);
}

export async function fetchBranchAvailability(
  branchId: string,
  date: string,
  serviceIds: string[],
  barberId?: string | null,
) {
  const query = new URLSearchParams({ date });
  if (serviceIds.length > 0) {
    query.set('serviceIds', serviceIds.join(','));
  }
  if (barberId) {
    query.set('barberId', barberId);
  }
  return await apiRequest<BranchAvailabilityResult>(
    `/salon/branches/${branchId}/availability?${query.toString()}`,
  );
}

export async function createCustomerAppointment(
  branchId: string,
  payload: CreateAppointmentPayload,
) {
  return await apiRequest<{ appointment: AppointmentResult }>(
    `/salon/branches/${branchId}/appointments`,
    {
      method: 'POST',
      body: payload,
    },
  );
}

export async function joinCustomerQueue(
  branchId: string,
  payload: { barberId?: string | null; serviceIds: string[] },
) {
  return await apiRequest<QueueJoinResult>(`/salon/branches/${branchId}/queue/join`, {
    method: 'POST',
    body: payload,
  });
}

export interface CustomerBookedAppointment {
  id: string;
  branch_id: string;
  branch_name: string;
  business_name: string;
  barber_id: string;
  barber_name: string;
  barber_avatar: string | null;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number;
  total_duration_minutes: number;
  services: {
    id?: string;
    service_id?: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
}

export async function fetchCustomerAppointments() {
  return await apiRequest<{ appointments: CustomerBookedAppointment[] }>(
    '/salon/customer/appointments',
  );
}

export async function cancelCustomerAppointment(appointmentId: string): Promise<void> {
  await apiRequest(`/salon/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  });
}

export async function rescheduleCustomerAppointment(
  appointmentId: string,
  startAt: string,
): Promise<void> {
  await apiRequest(`/salon/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: { startAt },
  });
}

export interface CustomerActiveQueue {
  id: string;
  branch_id: string;
  branch_name: string;
  branch_address: string;
  business_name: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  barber_name: string | null;
  barber_avatar: string | null;
  token_number: string | null;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE';
  position: number;
  people_ahead: number;
  estimated_wait_minutes: number;
  joined_at: string;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
  total_price: number;
  total_duration_minutes: number;
}

export async function fetchCustomerActiveQueue(): Promise<CustomerActiveQueue | null> {
  const data = await apiRequest<{ activeQueue: CustomerActiveQueue | null }>('/salon/customer/active-queue');
  return data.activeQueue;
}

export async function leaveCustomerQueue(): Promise<void> {
  await apiRequest<{ success: boolean }>('/salon/customer/queue/leave', {
    method: 'POST',
  });
}

export interface CustomerFavourite {
  id: string;
  type: 'SALON' | 'BARBER';
  target_id: string;
}

export async function fetchCustomerFavourites(): Promise<CustomerFavourite[]> {
  const data = await apiRequest<{ favourites: CustomerFavourite[] }>('/salon/customer/favourites');
  return data.favourites;
}

export async function addCustomerFavourite(type: 'SALON' | 'BARBER', targetId: string): Promise<void> {
  await apiRequest('/salon/customer/favourites', {
    method: 'POST',
    body: { type, targetId },
  });
}

export async function removeCustomerFavourite(type: 'SALON' | 'BARBER', targetId: string): Promise<void> {
  await apiRequest(`/salon/customer/favourites/${type}/${targetId}`, {
    method: 'DELETE',
  });
}



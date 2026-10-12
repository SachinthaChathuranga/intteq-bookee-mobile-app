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

import { apiRequest } from './client';
import type { QueueEntry } from './barber';

export interface BarberFloorState {
  barber_id: string;
  name: string | null;
  phone: string;
  avatar_url: string | null;
  shift_status: 'ACTIVE' | 'PAUSED' | 'ENDED' | 'NOT_STARTED';
  serving: QueueEntry | null;
  waiting: QueueEntry[];
  wait_time_minutes: number;
}

export interface WaitTimeSummary {
  general_wait_minutes: number;
  active_barbers_count: number;
  barber_wait_times: Record<string, number>;
}

export interface LiveFloorSummary {
  branch_id: string;
  general_queue: QueueEntry[];
  barbers: BarberFloorState[];
  wait_times: WaitTimeSummary;
  total_waiting_count: number;
  active_barbers_count: number;
}

export interface CreateWalkInInput {
  mode: 'ANONYMOUS' | 'VERIFIED';
  customerName?: string;
  phone?: string;
  serviceIds: string[];
  barberId?: string | null;
}

export interface CreateWalkInResult {
  entry: QueueEntry;
  token: string;
  estimated_wait_minutes: number;
}

export async function fetchBranchLiveFloor(branchId: string) {
  return await apiRequest<LiveFloorSummary>(`/salon/branches/${branchId}/live-floor`);
}

export async function fetchWaitTimes(branchId: string) {
  return await apiRequest<WaitTimeSummary>(`/salon/branches/${branchId}/wait-times`);
}

export async function addWalkIn(branchId: string, input: CreateWalkInInput) {
  return await apiRequest<CreateWalkInResult>(`/salon/branches/${branchId}/walk-ins`, {
    method: 'POST',
    body: input,
  });
}

export async function assignGeneralCustomer(branchId: string, entryId: string, targetBarberId: string) {
  return await apiRequest<{ entry: QueueEntry }>(`/salon/branches/${branchId}/queue/${entryId}/assign`, {
    method: 'POST',
    body: { target_barber_id: targetBarberId },
  });
}

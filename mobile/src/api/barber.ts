import { apiRequest } from './client';

export interface Shift {
  id: string;
  barber_id: string;
  branch_id: string;
  start_at: string;
  end_at: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
}

export interface OnShiftBarber {
  barber_id: string;
  name: string | null;
  phone: string;
  status: 'ACTIVE' | 'PAUSED';
  shift_id: string;
}

export interface ShiftSummary {
  shift: Shift;
  duration_minutes: number;
  completed_services_count: number;
  total_revenue: number;
  total_commission: number;
}

export interface QueueEntryServiceItem {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface QueueEntry {
  id: string;
  branch_id: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  barber_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  walk_in_name: string | null;
  token_number: string | null;
  source: string;
  manual_position: number | null;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'LEFT';
  joined_at: string;
  assigned_at: string | null;
  called_at: string | null;
  completed_at: string | null;
  reassigned_from_barber_id: string | null;
  services: QueueEntryServiceItem[];
  total_price: number;
  total_duration: number;
}

export interface CompleteServiceInput {
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER';
  tip?: number;
}

// Shift API
export async function fetchCurrentShift(branchId: string) {
  return await apiRequest<{
    shift: Shift | null;
    on_shift_barbers: OnShiftBarber[];
    summary: ShiftSummary | null;
  }>(`/salon/branches/${branchId}/shifts/current`);
}

export async function startShift(branchId: string) {
  return await apiRequest<{ shift: Shift }>(`/salon/branches/${branchId}/shifts/start`, {
    method: 'POST',
  });
}

export async function pauseShift(branchId: string) {
  return await apiRequest<{ shift: Shift }>(`/salon/branches/${branchId}/shifts/pause`, {
    method: 'POST',
  });
}

export async function resumeShift(branchId: string) {
  return await apiRequest<{ shift: Shift }>(`/salon/branches/${branchId}/shifts/resume`, {
    method: 'POST',
  });
}

export async function endShift(branchId: string) {
  return await apiRequest<{ summary: ShiftSummary }>(`/salon/branches/${branchId}/shifts/end`, {
    method: 'POST',
  });
}

// Queue API
export async function fetchBarberQueue(branchId: string) {
  return await apiRequest<{
    serving: QueueEntry | null;
    waiting: QueueEntry[];
    generalCount: number;
  }>(`/salon/branches/${branchId}/queue/barber`);
}

export async function callNextCustomer(branchId: string) {
  return await apiRequest<{ entry: QueueEntry | null }>(`/salon/branches/${branchId}/queue/call-next`, {
    method: 'POST',
  });
}

export async function completeService(branchId: string, entryId: string, input: CompleteServiceInput) {
  return await apiRequest<{
    entry: QueueEntry;
    transaction_id: string;
    commission_amount: number;
  }>(`/salon/branches/${branchId}/queue/${entryId}/complete`, {
    method: 'POST',
    body: input,
  });
}

export async function markNoShow(branchId: string, entryId: string) {
  return await apiRequest<{ ok: boolean }>(`/salon/branches/${branchId}/queue/${entryId}/no-show`, {
    method: 'POST',
  });
}

export async function markCustomerLeft(branchId: string, entryId: string) {
  return await apiRequest<{ ok: boolean }>(`/salon/branches/${branchId}/queue/${entryId}/left`, {
    method: 'POST',
  });
}

export async function reassignCustomer(branchId: string, entryId: string, targetBarberId: string) {
  return await apiRequest<{ entry: QueueEntry }>(`/salon/branches/${branchId}/queue/${entryId}/reassign`, {
    method: 'POST',
    body: { target_barber_id: targetBarberId },
  });
}

export async function autoReassignAll(branchId: string) {
  return await apiRequest<{ ok: boolean; reassigned_count: number }>(`/salon/branches/${branchId}/queue/auto-reassign-all`, {
    method: 'POST',
  });
}

export async function reorderQueue(branchId: string, entryIds: string[]) {
  return await apiRequest<{ ok: boolean }>(`/salon/branches/${branchId}/queue/reorder`, {
    method: 'POST',
    body: { entry_ids: entryIds },
  });
}

export async function devEnqueueCustomer(
  branchId: string,
  input: {
    customerName: string;
    tokenNumber?: string;
    serviceIds: string[];
    barberId?: string | null;
    queueType?: 'BARBER' | 'GENERAL';
  },
) {
  return await apiRequest<{ entry: QueueEntry }>(`/salon/branches/${branchId}/queue/dev-enqueue`, {
    method: 'POST',
    body: input,
  });
}

export interface BarberAppointment {
  id: string;
  branch_id: string;
  barber_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  total_price: number;
  total_duration_minutes: number;
  services: {
    id: string;
    service_id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
}

export async function fetchBarberAppointments(branchId: string, date?: string) {
  const qs = date ? `?date=${date}` : '';
  return await apiRequest<{ appointments: BarberAppointment[] }>(
    `/salon/branches/${branchId}/barber/appointments${qs}`,
  );
}

export async function markAppointmentArrived(appointmentId: string) {
  return await apiRequest<{
    success: boolean;
    id: string;
    branch_id: string;
    status: string;
    queueEntryId: string;
    token: string;
  }>(`/salon/appointments/${appointmentId}/mark-arrived`, {
    method: 'POST',
  });
}

export async function rescheduleBarberAppointment(appointmentId: string, startAt: string) {
  return await apiRequest<{
    success: boolean;
    appointment: {
      id: string;
      branch_id: string;
      start_at: string;
      end_at: string;
      status: string;
    };
  }>(`/salon/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: { startAt },
  });
}

export async function requestCancelCustomer(branchId: string, entryId: string) {
  return await apiRequest<{ ok: boolean; sentSms: boolean }>(
    `/salon/branches/${branchId}/queue/${entryId}/request-cancel`,
    {
      method: 'POST',
    },
  );
}


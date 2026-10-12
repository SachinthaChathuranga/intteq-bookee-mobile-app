import { apiRequest } from './client';

export interface WorkingHoursDay {
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  open_time: string;   // '09:00:00' or '09:00'
  close_time: string;  // '18:00:00' or '18:00'
  is_closed: boolean;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string | Record<string, unknown> | null;
  phone: string | null;
  is_active: boolean;
  working_hours?: WorkingHoursDay[];
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  branch_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BarberDetail {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_value: number;
  is_active: boolean;
}

export interface InviteDetail {
  id: string;
  phone: string;
  code: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_value: number;
  expires_at: string;
}

export interface CreateBranchInput {
  name: string;
  address?: string;
  phone?: string;
  working_hours?: WorkingHoursDay[];
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phone?: string;
  working_hours?: WorkingHoursDay[];
  is_active?: boolean;
}

export interface CreateServiceInput {
  name: string;
  duration_minutes: number;
  price: number;
  is_active?: boolean;
}

export interface UpdateServiceInput {
  name?: string;
  duration_minutes?: number;
  price?: number;
  is_active?: boolean;
}

export interface CreateInviteInput {
  phone: string;
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_value: number;
}

// Branch endpoints
export async function fetchBranches(): Promise<Branch[]> {
  const data = await apiRequest<{ branches: Branch[] }>('/owner/branches');
  return data.branches;
}

export async function fetchBranch(id: string): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>(`/owner/branches/${id}`);
  return data.branch;
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>('/owner/branches', {
    method: 'POST',
    body: input,
  });
  return data.branch;
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<Branch> {
  const data = await apiRequest<{ branch: Branch }>(`/owner/branches/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return data.branch;
}

// Service endpoints
export async function fetchServices(branchId: string): Promise<Service[]> {
  const data = await apiRequest<{ services: Service[] }>(`/owner/branches/${branchId}/services`);
  return data.services;
}

export async function createService(branchId: string, input: CreateServiceInput): Promise<Service> {
  const data = await apiRequest<{ service: Service }>(`/owner/branches/${branchId}/services`, {
    method: 'POST',
    body: input,
  });
  return data.service;
}

export async function updateService(branchId: string, serviceId: string, input: UpdateServiceInput): Promise<Service> {
  const data = await apiRequest<{ service: Service }>(`/owner/branches/${branchId}/services/${serviceId}`, {
    method: 'PATCH',
    body: input,
  });
  return data.service;
}

// Salon barber & invite endpoints
export async function fetchBarbersAndInvites(branchId: string): Promise<{ barbers: BarberDetail[]; invites: InviteDetail[] }> {
  return await apiRequest<{ barbers: BarberDetail[]; invites: InviteDetail[] }>(`/salon/branches/${branchId}/barbers`);
}

export async function createInvite(
  branchId: string,
  input: CreateInviteInput,
): Promise<{ invite: InviteDetail; sms_mock?: string }> {
  return await apiRequest<{ invite: InviteDetail; sms_mock?: string }>(`/salon/branches/${branchId}/invites`, {
    method: 'POST',
    body: input,
  });
}

export async function cancelInvite(branchId: string, inviteId: string): Promise<void> {
  await apiRequest(`/salon/branches/${branchId}/invites/${inviteId}/cancel`, {
    method: 'PATCH',
  });
}

export async function updateBarberCommission(
  branchId: string,
  barberId: string,
  input: { commission_type: 'PERCENTAGE' | 'FIXED'; commission_value: number },
): Promise<void> {
  await apiRequest(`/salon/branches/${branchId}/barbers/${barberId}/commission`, {
    method: 'PATCH',
    body: input,
  });
}

export async function acceptInvite(code: string): Promise<{ ok: boolean; business_name: string; branch_name: string }> {
  return await apiRequest<{ ok: boolean; business_name: string; branch_name: string }>('/salon/invites/accept', {
    method: 'POST',
    body: { code },
  });
}

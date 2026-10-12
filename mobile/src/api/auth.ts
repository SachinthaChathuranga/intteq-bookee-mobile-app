import type { User } from '../store/authStore';
import { apiRequest } from './client';

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser: boolean;
}

export const requestOtp = (phone: string) =>
  apiRequest('/auth/otp/request', { method: 'POST', body: { phone }, auth: false });

export const verifyOtp = (phone: string, code: string) =>
  apiRequest<SessionResponse>('/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false });

export const logout = (refreshToken: string) =>
  apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });

export const fetchMe = () => apiRequest<{ user: User }>('/me');

export const updateMe = (patch: Partial<Pick<User, 'name' | 'language' | 'theme'>>) =>
  apiRequest<{ user: User }>('/me', { method: 'PATCH', body: patch });

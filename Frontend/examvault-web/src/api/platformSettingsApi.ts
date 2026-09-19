import apiClient from './axiosClient';
import type { PlatformSettings, UpdatePlatformSettingsRequest } from '../types/platformSettings';

export interface PlatformBranding {
  platformName: string;
  platformTagline: string;
}

// The only unauthenticated read on this API - Platform Name/Tagline need to
// render on the sign-in screen before anyone has logged in, so this hits a
// dedicated public endpoint rather than the SuperAdmin-only one below.
export async function getPlatformBranding(): Promise<PlatformBranding> {
  const { data } = await apiClient.get<PlatformBranding>('/api/platform-settings/branding');
  return data;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { data } = await apiClient.get<PlatformSettings>('/api/platform-settings');
  return data;
}

export async function updatePlatformSettings(request: UpdatePlatformSettingsRequest): Promise<PlatformSettings> {
  const { data } = await apiClient.put<PlatformSettings>('/api/platform-settings', request);
  return data;
}

export async function sendTestEmail(toEmail: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/api/platform-settings/test-email', { toEmail });
  return data;
}

export type EmailConnectionStatusValue = 'NotConfigured' | 'Reachable' | 'Unreachable';

export interface EmailConnectionStatus {
  status: EmailConnectionStatusValue;
}

export async function getEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const { data } = await apiClient.get<EmailConnectionStatus>('/api/platform-settings/email-connection-status');
  return data;
}

export interface EmailSummary {
  sentToday: number;
  deliveredToday: number;
  failedToday: number;
  deliveryRatePercent: number | null;
}

export async function getEmailSummary(): Promise<EmailSummary> {
  const { data } = await apiClient.get<EmailSummary>('/api/platform-settings/email-summary');
  return data;
}

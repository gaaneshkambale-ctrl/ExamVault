import { getAccessToken } from '../api/axiosClient';
import { decodeFeatures } from '../utils/features';
import { useAuth } from './useAuth';

/**
 * Gates UI on the current user's live `feature` claims (Users, Exams,
 * LiveMonitoring, Results, Reports, Notifications, Settings - the same
 * PlanFeature catalog every backend service's Feature: policy enforces).
 * SuperAdmin always passes regardless of claims, matching every backend
 * policy's own role bypass (SuperAdmin isn't tied to a tenant's plan, so
 * their token never carries this claim at all). Reads the token fresh on
 * every call rather than through React Context, same "eventually
 * consistent within one refresh cycle" model usePermissions already uses -
 * a feature revoked on the Super Admin side takes effect for an already
 * logged-in Admin on their next silent token refresh, not instantly.
 */
export function useFeatures() {
  const { user } = useAuth();
  const features = decodeFeatures(getAccessToken());
  const hasFeature = (feature: string) => user?.role === 'SuperAdmin' || features.has(feature);
  return { features, hasFeature };
}

import { getAccessToken } from '../api/axiosClient';
import { decodePermissions } from '../utils/permissions';

/**
 * Gates UI on the current user's live `permission` claims (Exams - Edit,
 * Questions - Create, Results - View, etc. - the same catalog the backend
 * enforces). Reads the token fresh on every call rather than through
 * React Context, so it's never more than one re-render behind whatever
 * axiosClient currently holds - not subscribed to token changes that
 * happen with no other React state update (e.g. a silent background
 * refresh with no visible UI change), matching this app's existing
 * "eventually consistent within one refresh cycle" permission model
 * rather than promising instant reactivity.
 */
export function usePermissions() {
  const permissions = decodePermissions(getAccessToken());
  return {
    permissions,
    hasPermission: (key: string) => permissions.has(key),
  };
}

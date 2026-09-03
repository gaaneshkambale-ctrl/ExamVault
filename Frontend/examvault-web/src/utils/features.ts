import { jwtDecode } from 'jwt-decode';

// Matches the backend's FeatureClaimTypes.Feature (Backend/Shared/
// OnlineExamSystem.Shared.Common/Multitenancy/FeatureClaimTypes.cs) - one
// claim of this type per PlanFeature enabled on the caller's tenant Plan,
// embedded by User Service at login/refresh. Same multi-valued-claim shape
// as the "permission" claim decodePermissions already handles (bare string
// when there's exactly one, JSON array for 2+).
const FEATURE_CLAIM = 'feature';

interface DecodedAccessToken {
  [FEATURE_CLAIM]?: string | string[];
}

/**
 * Decodes the current access token's enabled PlanFeature names (e.g.
 * "LiveMonitoring", "Reports") into a Set for O(1) lookups. SuperAdmin
 * tokens never carry this claim at all (see FeatureClaimTypes.cs's own
 * comment - SuperAdmin bypasses on role instead since they aren't tied to
 * any tenant's plan), so an empty result here is expected and correct for
 * that role, not a decoding failure - callers must check role separately,
 * same as every backend Feature: policy does.
 */
export function decodeFeatures(accessToken: string | null): Set<string> {
  if (!accessToken) {
    return new Set();
  }

  try {
    const decoded = jwtDecode<DecodedAccessToken>(accessToken);
    const claim = decoded[FEATURE_CLAIM];
    if (!claim) {
      return new Set();
    }
    return new Set(Array.isArray(claim) ? claim : [claim]);
  } catch {
    return new Set();
  }
}

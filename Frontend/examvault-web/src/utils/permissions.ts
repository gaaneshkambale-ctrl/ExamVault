import { jwtDecode } from 'jwt-decode';

// Matches the backend's PermissionClaimTypes.Permission
// (Backend/Shared/OnlineExamSystem.Shared.Common/Multitenancy/PermissionClaimTypes.cs)
// - one claim of this type per granted RolePermission key. The JWT library
// that signs the token collapses same-name claims into a JSON array when
// there are 2+, but serializes a lone one as a bare string - handle both.
const PERMISSION_CLAIM = 'permission';

interface DecodedAccessToken {
  [PERMISSION_CLAIM]?: string | string[];
}

/**
 * Decodes the current access token's granted permission keys (e.g.
 * "Exams - Edit") into a Set for O(1) lookups. Reads the token fresh each
 * call rather than caching in React state, so it's always in sync with
 * whatever token axiosClient currently holds - no separate invalidation
 * needed when login/refresh (including the silent 401 refresh, which
 * happens outside React entirely) swaps it out.
 */
export function decodePermissions(accessToken: string | null): Set<string> {
  if (!accessToken) {
    return new Set();
  }

  try {
    const decoded = jwtDecode<DecodedAccessToken>(accessToken);
    const claim = decoded[PERMISSION_CLAIM];
    if (!claim) {
      return new Set();
    }
    return new Set(Array.isArray(claim) ? claim : [claim]);
  } catch {
    return new Set();
  }
}

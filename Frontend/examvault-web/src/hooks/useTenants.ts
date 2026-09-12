import { useQuery } from '@tanstack/react-query';
import { getMyTenant, listTenants } from '../api/tenantsApi';

export function useTenants(enabled = true) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    enabled,
  });
}

export function useMyTenant() {
  return useQuery({
    queryKey: ['tenants', 'mine'],
    queryFn: getMyTenant,
  });
}

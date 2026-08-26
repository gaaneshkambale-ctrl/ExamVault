import { useQuery } from '@tanstack/react-query';
import { listTenants } from '../api/tenantsApi';

export function useTenants(enabled = true) {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
    enabled,
  });
}

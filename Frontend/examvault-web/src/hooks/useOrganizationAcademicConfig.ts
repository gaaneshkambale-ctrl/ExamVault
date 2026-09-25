import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrganizationAcademicConfig, updateOrganizationAcademicConfig } from '../api/organizationAcademicConfigApi';
import type { UpdateOrganizationAcademicConfigRequest } from '../types/organizationAcademicConfig';

const QUERY_KEY = ['organization-academic-config'];

export function useOrganizationAcademicConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getOrganizationAcademicConfig,
  });
}

export function useUpdateOrganizationAcademicConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateOrganizationAcademicConfigRequest) => updateOrganizationAcademicConfig(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

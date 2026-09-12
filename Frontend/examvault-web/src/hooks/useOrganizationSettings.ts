import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  uploadOrganizationAsset,
  removeOrganizationAsset,
} from '../api/organizationSettingsApi';
import type { UpdateOrganizationSettingsRequest } from '../types/organizationSettings';

const QUERY_KEY = ['organization-settings'];

export function useOrganizationSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getOrganizationSettings,
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateOrganizationSettingsRequest) => updateOrganizationSettings(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUploadOrganizationAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ asset, file }: { asset: 'logo' | 'favicon' | 'signature'; file: File }) =>
      uploadOrganizationAsset(asset, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRemoveOrganizationAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: 'logo' | 'favicon' | 'signature') => removeOrganizationAsset(asset),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

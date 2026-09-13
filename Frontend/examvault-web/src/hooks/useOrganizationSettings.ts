import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrganizationSettings,
  getOrganizationBranding,
  updateOrganizationSettings,
  uploadOrganizationAsset,
  removeOrganizationAsset,
} from '../api/organizationSettingsApi';
import type { UpdateOrganizationSettingsRequest } from '../types/organizationSettings';

const QUERY_KEY = ['organization-settings'];
const BRANDING_QUERY_KEY = ['organization-branding'];

export function useOrganizationSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getOrganizationSettings,
  });
}

// Same data as useOrganizationSettings, but via the "branding" endpoint any
// authenticated tenant member can call (not just Admin/SuperAdmin) - for
// UI, like the student sidebar, that needs to read organizationType (eg. to
// gate the "My Certificates" nav item per reportTypeCatalog.ts) without
// Settings permission.
export function useOrganizationBranding() {
  return useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: getOrganizationBranding,
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

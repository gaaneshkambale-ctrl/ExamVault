import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAcademicListItems, createAcademicListItem, deleteAcademicListItem } from '../api/academicListsApi';
import type { AcademicListType, CreateAcademicListItemRequest } from '../types/academicListItem';

export function useAcademicListItems(listType: AcademicListType, parentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['academic-list-items', listType, parentId],
    queryFn: () => getAcademicListItems(listType, parentId),
    enabled,
  });
}

export function useCreateAcademicListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateAcademicListItemRequest) => createAcademicListItem(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academic-list-items', variables.listType, variables.parentId] });
    },
  });
}

export function useDeleteAcademicListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAcademicListItem(id),
    // A delete cascades server-side to descendants across levels this
    // client doesn't track, so invalidate every academic-list-items query
    // rather than trying to target just the affected one.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-list-items'] }),
  });
}

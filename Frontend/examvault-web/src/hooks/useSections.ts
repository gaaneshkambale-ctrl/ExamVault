import { useQuery } from '@tanstack/react-query';
import { getSection, listSections } from '../api/sectionApi';

export function useSections(examId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['sections', examId],
    queryFn: () => listSections(examId!),
    enabled: !!examId && enabled,
  });
}

export function useSection(examId: string | undefined, sectionId: string | undefined) {
  return useQuery({
    queryKey: ['sections', examId, sectionId],
    queryFn: () => getSection(examId!, sectionId!),
    enabled: !!examId && !!sectionId,
  });
}

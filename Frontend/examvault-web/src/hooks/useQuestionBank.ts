import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addBankQuestionsToExam,
  addRandomBankQuestionsToExam,
  createBankQuestion,
  createBankSubject,
  createBankTag,
  bulkSetBankStatus,
  createBankTopic,
  deleteBankQuestion,
  deleteBankSubject,
  deleteBankTag,
  duplicateBankQuestion,
  deleteBankTopic,
  listBankQuestions,
  listBankSubjects,
  listBankTags,
  listBankTopics,
  previewRandomDraw,
  renameBankTopic,
  updateBankQuestion,
  updateBankSubject,
} from '../api/questionBankApi';
import type { BankQuestionFilters, RandomDrawRule, SaveBankQuestionRequest } from '../types/questionBank';

const KEY = ['questionBank'] as const;

export function useBankSubjects() {
  return useQuery({ queryKey: [...KEY, 'subjects'], queryFn: listBankSubjects });
}

export function useBankTopics(subjectId?: string) {
  return useQuery({ queryKey: [...KEY, 'topics', subjectId ?? 'all'], queryFn: () => listBankTopics(subjectId) });
}

export function useBankTags() {
  return useQuery({ queryKey: [...KEY, 'tags'], queryFn: listBankTags });
}

export function useBankQuestions(filters: BankQuestionFilters) {
  return useQuery({
    queryKey: [...KEY, 'questions', filters],
    queryFn: () => listBankQuestions(filters),
    placeholderData: keepPreviousData,
  });
}

// Every taxonomy/question write can change counts shown elsewhere in the
// bank (subject/topic/tag question counts), so they all invalidate the
// whole questionBank tree rather than hand-picking keys.
function useBankMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export const useCreateBankSubject = () => useBankMutation(createBankSubject);
export const useUpdateBankSubject = () =>
  useBankMutation((v: { id: string; name: string; description?: string | null }) =>
    updateBankSubject(v.id, { name: v.name, description: v.description }));
export const useDeleteBankSubject = () => useBankMutation(deleteBankSubject);
export const useCreateBankTopic = () => useBankMutation(createBankTopic);
export const useRenameBankTopic = () =>
  useBankMutation((v: { id: string; subjectId: string; name: string }) =>
    renameBankTopic(v.id, { subjectId: v.subjectId, name: v.name }));
export const useDeleteBankTopic = () => useBankMutation(deleteBankTopic);
export const useCreateBankTag = () => useBankMutation(createBankTag);
export const useDeleteBankTag = () => useBankMutation(deleteBankTag);
export const useDeleteBankQuestion = () => useBankMutation(deleteBankQuestion);
export const useCreateBankQuestion = () => useBankMutation(createBankQuestion);
export const useUpdateBankQuestion = () =>
  useBankMutation((v: { id: string; body: SaveBankQuestionRequest }) => updateBankQuestion(v.id, v.body));

// Adding copies changes the exam's own question list AND the bank's usage
// counts / "already added" flags, so both trees are refreshed.
export function useAddBankQuestionsToExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addBankQuestionsToExam,
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', vars.examId] });
    },
  });
}

export const useDuplicateBankQuestion = () => useBankMutation(duplicateBankQuestion);
export const useBulkSetBankStatus = () => useBankMutation(bulkSetBankStatus);

// Live "how many could each rule draw" numbers. Only asked once every rule is
// complete (subject chosen, count >= 1); kept fresh for a few seconds only,
// since other people may be editing the bank.
export function useRandomDrawPreview(examId: string, rules: RandomDrawRule[]) {
  const complete = rules.length > 0 && rules.every((r) => r.subjectId && r.count >= 1);
  return useQuery({
    queryKey: [...KEY, 'randomPreview', examId, rules],
    queryFn: () => previewRandomDraw({ examId, rules }),
    enabled: complete,
    staleTime: 5_000,
  });
}

export function useAddRandomBankQuestionsToExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addRandomBankQuestionsToExam,
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['questions', 'byExam', vars.examId] });
    },
  });
}

import apiClient from './axiosClient';
import type {
  AddBankQuestionsToExamResult,
  BankQuestion,
  BankQuestionFilters,
  BankQuestionPage,
  BankQuestionStatus,
  BankSubject,
  BankTag,
  BankTopic,
  RandomDrawRule,
  RandomRuleAvailability,
  SaveBankQuestionRequest,
} from '../types/questionBank';

const BASE = '/api/question-bank';

export async function listBankSubjects(): Promise<BankSubject[]> {
  const { data } = await apiClient.get<BankSubject[]>(`${BASE}/subjects`);
  return data;
}

export async function createBankSubject(body: { name: string; description?: string | null }): Promise<BankSubject> {
  const { data } = await apiClient.post<BankSubject>(`${BASE}/subjects`, body);
  return data;
}

export async function updateBankSubject(
  id: string,
  body: { name: string; description?: string | null },
): Promise<BankSubject> {
  const { data } = await apiClient.put<BankSubject>(`${BASE}/subjects/${id}`, body);
  return data;
}

export async function deleteBankSubject(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/subjects/${id}`);
}

export async function listBankTopics(subjectId?: string): Promise<BankTopic[]> {
  const { data } = await apiClient.get<BankTopic[]>(`${BASE}/topics`, { params: { subjectId } });
  return data;
}

export async function createBankTopic(body: { subjectId: string; name: string }): Promise<BankTopic> {
  const { data } = await apiClient.post<BankTopic>(`${BASE}/topics`, body);
  return data;
}

export async function renameBankTopic(id: string, body: { subjectId: string; name: string }): Promise<BankTopic> {
  const { data } = await apiClient.put<BankTopic>(`${BASE}/topics/${id}`, body);
  return data;
}

export async function deleteBankTopic(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/topics/${id}`);
}

export async function listBankTags(): Promise<BankTag[]> {
  const { data } = await apiClient.get<BankTag[]>(`${BASE}/tags`);
  return data;
}

export async function createBankTag(body: { name: string }): Promise<BankTag> {
  const { data } = await apiClient.post<BankTag>(`${BASE}/tags`, body);
  return data;
}

export async function deleteBankTag(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/tags/${id}`);
}

export async function listBankQuestions(filters: BankQuestionFilters): Promise<BankQuestionPage> {
  const { data } = await apiClient.get<BankQuestionPage>(`${BASE}/questions`, {
    params: { ...filters, search: filters.search || undefined },
  });
  return data;
}

export async function getBankQuestion(id: string): Promise<BankQuestion> {
  const { data } = await apiClient.get<BankQuestion>(`${BASE}/questions/${id}`);
  return data;
}

export async function createBankQuestion(body: SaveBankQuestionRequest): Promise<BankQuestion> {
  const { data } = await apiClient.post<BankQuestion>(`${BASE}/questions`, body);
  return data;
}

export async function updateBankQuestion(id: string, body: SaveBankQuestionRequest): Promise<BankQuestion> {
  const { data } = await apiClient.put<BankQuestion>(`${BASE}/questions/${id}`, body);
  return data;
}

export async function deleteBankQuestion(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/questions/${id}`);
}

// Copies bank questions into an exam (optionally straight into a section).
export async function addBankQuestionsToExam(body: {
  examId: string;
  sectionId?: string | null;
  bankQuestionIds: string[];
}): Promise<AddBankQuestionsToExamResult> {
  const { data } = await apiClient.post<AddBankQuestionsToExamResult>(`${BASE}/add-to-exam`, body);
  return data;
}

// A Draft copy owned by the caller.
export async function duplicateBankQuestion(id: string): Promise<BankQuestion> {
  const { data } = await apiClient.post<BankQuestion>(`${BASE}/questions/${id}/duplicate`);
  return data;
}

export interface BulkBankStatusResult {
  updated: number;
  skipped: { bankQuestionId: string; reason: string }[];
}

export async function bulkSetBankStatus(body: { ids: string[]; status: BankQuestionStatus }): Promise<BulkBankStatusResult> {
  const { data } = await apiClient.post<BulkBankStatusResult>(`${BASE}/questions/bulk-status`, body);
  return data;
}

export async function previewRandomDraw(body: { examId: string; rules: RandomDrawRule[] }): Promise<RandomRuleAvailability[]> {
  const { data } = await apiClient.post<RandomRuleAvailability[]>(`${BASE}/random-preview`, body);
  return data;
}

// Draws the rules into the exam as fixed copies. All-or-nothing on the server.
export async function addRandomBankQuestionsToExam(body: {
  examId: string;
  sectionId?: string | null;
  rules: RandomDrawRule[];
}): Promise<AddBankQuestionsToExamResult> {
  const { data } = await apiClient.post<AddBankQuestionsToExamResult>(`${BASE}/add-random-to-exam`, body);
  return data;
}

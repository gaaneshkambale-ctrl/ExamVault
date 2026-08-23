import apiClient from './axiosClient';
import type { RunCodeRequest, RunCodeResponse, RunSqlRequest } from '../types/execution';

export async function runCode(request: RunCodeRequest): Promise<RunCodeResponse> {
  const { data } = await apiClient.post<RunCodeResponse>('/api/execution/run', request);
  return data;
}

export async function runSql(request: RunSqlRequest): Promise<RunCodeResponse> {
  const { data } = await apiClient.post<RunCodeResponse>('/api/execution/run-sql', request);
  return data;
}

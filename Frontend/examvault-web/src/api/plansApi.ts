import apiClient from './axiosClient';
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from '../types/plan';

export async function listPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>('/api/plans');
  return data;
}

// Anonymous - backs the public marketing site's Pricing teaser (Home.tsx).
// Excludes the internal "Full Access" default plan server-side.
export async function listPublicPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>('/api/plans/public');
  return data;
}

export async function createPlan(request: CreatePlanRequest): Promise<Plan> {
  const { data } = await apiClient.post<Plan>('/api/plans', request);
  return data;
}

export async function updatePlan(id: string, request: UpdatePlanRequest): Promise<Plan> {
  const { data } = await apiClient.put<Plan>(`/api/plans/${id}`, request);
  return data;
}

export async function deletePlan(id: string): Promise<void> {
  await apiClient.delete(`/api/plans/${id}`);
}

export async function assignPlanToTenant(tenantId: string, planId: string): Promise<void> {
  await apiClient.put(`/api/tenants/${tenantId}/plan`, { planId });
}

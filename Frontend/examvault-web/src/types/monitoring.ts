export type ServiceHealthStatus = 'Online' | 'Degraded' | 'Offline';

export interface ServiceStatusEntry {
  name: string;
  status: ServiceHealthStatus;
  responseTimeMs: number | null;
}

export type ComponentHealthStatus = 'Healthy' | 'Unhealthy';

export interface SystemHealthResponse {
  database: ComponentHealthStatus;
  messageQueue: ComponentHealthStatus;
}

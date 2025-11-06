export interface IMockLogEntry {
  id?: string;
  endpointId?: string | null;
  method: string;
  path: string;
  query?: Record<string, any> | null;
  body?: any | null;
  headers?: Record<string, any> | null;
  ip?: string | null;
  response?: any | null;
  statusCode: number;
  duration?: number;
  cacheHit?: boolean;
  createdAt?: Date;
}

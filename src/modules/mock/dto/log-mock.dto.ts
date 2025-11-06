export type MockLogCreateDto = {
  endpointId?: string | null;
  method: string;
  path: string;
  query?: any;
  body?: any;
  headers?: any;
  ip?: string | null;
  response?: any;
  statusCode?: number;
  duration?: number;
  cacheHit?: boolean;
};

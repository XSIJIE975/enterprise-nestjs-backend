export interface IMockContext {
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
  headers?: Record<string, string>;
  request?: any; // optional raw request object if engine needs extra info
  requestId?: string;
  userId?: string | null;
}

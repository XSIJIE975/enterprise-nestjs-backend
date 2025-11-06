export type TemplateEngineType = 'MOCKJS' | 'JSON' | 'HANDLEBARS';

export interface IMockEndpoint {
  id: string;
  name: string;
  path: string;
  method: string; // 'GET' | 'POST' | ... | 'ALL'
  enabled: boolean;
  statusCode: number;
  delay: number;
  responseTemplate: string; // serialized JSON/text template
  templateEngine: TemplateEngineType;
  headers?: Record<string, string>;
  validation?: any;
  version: number;
}

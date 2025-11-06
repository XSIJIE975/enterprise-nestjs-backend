export type TemplateEngineType = 'MOCKJS' | 'JSON' | 'HANDLEBARS';

import { IMockContext } from '../interfaces/mock-context.interface';

export abstract class BaseEngine {
  abstract readonly name: TemplateEngineType;

  /**
   * Render the template with provided context.
   * @param template - template string (usually JSON string for MockJS)
   * @param context - safe rendering context (params, query, body, request)
   */
  abstract render(template: string, context: IMockContext): Promise<unknown>;
}

import { BaseEngine, TemplateEngineType } from './base.engine';
import { IMockContext } from '../interfaces/mock-context.interface';

export class JsonEngine extends BaseEngine {
  readonly name: TemplateEngineType = 'JSON';

  async render(template: string, _context: IMockContext): Promise<unknown> {
    const tpl = template || '';
    if (!tpl) return null;
    try {
      return JSON.parse(tpl);
    } catch (err) {
      // if parsing fails, return raw string to avoid crashing caller
      throw new Error(`JSON engine parse failed: ${String(err)}`);
    }
  }
}

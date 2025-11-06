import { IMockContext } from './mock-context.interface';

export interface ITemplateEngine {
  render(template: string, context: IMockContext): Promise<unknown>;
  compile?(template: string): unknown;
}

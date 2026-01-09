import { Injectable } from '@nestjs/common';
import { MockJSEngine } from '@/modules/mock/engines';
import { IMockContext } from '@/modules/mock/interfaces';
import { JsonEngine } from '../engines/json.engine';
import { TemplateEngineType } from '../engines/base.engine';

@Injectable()
export class MockEngineService {
  constructor(
    private readonly mockjs: MockJSEngine,
    private readonly jsonEngine: JsonEngine,
  ) {}

  /**
   * Render a template using the requested engine type.
   * Defaults to MOCKJS if engine is not provided or unknown.
   */
  async render(
    template: string,
    engine: TemplateEngineType | string | undefined,
    context: IMockContext,
  ) {
    const engineType = (engine || 'MOCKJS') as TemplateEngineType;
    switch (engineType) {
      case 'JSON':
        return this.jsonEngine.render(template, context);
      case 'MOCKJS':
      default:
        return this.mockjs.render(template, context);
    }
  }
}

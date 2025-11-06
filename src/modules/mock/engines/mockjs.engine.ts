import Mock from 'mockjs';
import { createHash } from 'crypto';
import { VM } from 'vm2';
import { BaseEngine, TemplateEngineType } from './base.engine';
import { IMockContext } from '../interfaces/mock-context.interface';

/**
 * MockJS engine with vm2 sandbox.
 * - Parses JSON template string
 * - Caches parsed templates by hash
 * - Uses vm2 to execute Mock.mock in a sandbox with a short timeout
 *
 * Rationale: we keep parsed template caching outside the VM (reduces
 * repeated JSON.parse cost) while invoking Mock.mock inside a small
 * sandbox to limit potential side-effects if template processing
 * evolution ever requires execution context.
 */
export class MockJSEngine extends BaseEngine {
  readonly name: TemplateEngineType = 'MOCKJS';
  private readonly templateCache = new Map<string, unknown>();

  private hash(template: string) {
    return createHash('sha256')
      .update(template || '')
      .digest('hex');
  }

  private sanitizeContext(_context: IMockContext) {
    // expose only safe fields
    return {
      params: _context?.params || {},
      query: _context?.query || {},
      body: _context?.body || {},
    };
  }

  async render(template: string, _context: IMockContext): Promise<unknown> {
    const tpl = template || '{}';
    const key = this.hash(tpl);

    let parsed = this.templateCache.get(key);
    if (!parsed) {
      try {
        parsed = JSON.parse(tpl);
      } catch (err) {
        throw new Error(`MockJS template parse failed: ${String(err)}`);
      }

      // cache parsed template (small memory footprint expected)
      this.templateCache.set(key, parsed);
      // keep cache size bounded
      if (this.templateCache.size > 500) {
        // drop oldest (simple strategy)
        const firstKey = this.templateCache.keys().next().value;
        this.templateCache.delete(firstKey);
      }
    }

    try {
      // run Mock.mock inside a vm2 sandbox to limit execution time and
      // isolate any potential side effects. We inject the Mock object and
      // the parsed template into the sandbox.
      const vm = new VM({
        timeout: 1000,
        sandbox: {
          Mock,
          parsedTemplate: parsed,
          context: this.sanitizeContext(_context),
        },
      });
      const res = vm.run(`(function(){ return Mock.mock(parsedTemplate); })()`);
      return res;
    } catch (err) {
      throw new Error(`MockJS render failed: ${String(err)}`);
    }
  }
}

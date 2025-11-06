import { match } from 'path-to-regexp';

export class PathMatcher {
  static match(
    pattern: string,
    path: string,
  ): { matched: boolean; params: Record<string, any> } {
    try {
      const fn = match(pattern, { decode: decodeURIComponent });
      const result = fn(path);
      if (!result) return { matched: false, params: {} };
      return { matched: true, params: result.params as Record<string, any> };
    } catch {
      return { matched: false, params: {} };
    }
  }
}

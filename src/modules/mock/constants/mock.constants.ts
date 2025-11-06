export const MOCK_ENDPOINT_KEY_PREFIX = 'mock:endpoint';
export const MOCK_ENDPOINT_LIST_KEY = 'mock:endpoints:all';

export function endpointCacheKey(
  path: string,
  method: string,
  version?: number,
) {
  const v = typeof version === 'number' ? `:v${version}` : '';
  return `${MOCK_ENDPOINT_KEY_PREFIX}:${path}:${method}${v}`;
}

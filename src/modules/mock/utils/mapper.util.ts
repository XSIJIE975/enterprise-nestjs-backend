import type { IMockEndpoint } from '@/modules/mock/interfaces';
import { MockEndpointVo } from '@/modules/mock/vo';

export function mapToVo(endpoint: IMockEndpoint): MockEndpointVo {
  return MockEndpointVo.from(endpoint);
}

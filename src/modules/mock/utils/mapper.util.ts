import type { IMockEndpoint } from '../interfaces/mock-endpoint.interface';
import { MockEndpointVo } from '../vo/mock-endpoint.vo';

export function mapToVo(endpoint: IMockEndpoint): MockEndpointVo {
  return MockEndpointVo.from(endpoint);
}

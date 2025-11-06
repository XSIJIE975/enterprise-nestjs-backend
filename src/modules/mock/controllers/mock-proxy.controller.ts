import { All, Controller, UseGuards } from '@nestjs/common';
import { MockProxyGuard } from '../guards/mock-proxy.guard';

@Controller('mock')
@UseGuards(MockProxyGuard)
export class MockProxyController {
  // Catch-all - Guard handles responses, this is a fallback
  @All('*')
  async handleMockRequest() {
    // If no mock matched, let the framework return 404
    return;
  }
}

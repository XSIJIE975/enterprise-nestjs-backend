import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateMockEndpointDto } from '../dto/create-mock-endpoint.dto';
import { UpdateMockEndpointDto } from '../dto/update-mock-endpoint.dto';
import { MockService } from '../services/mock.service';
import { mapToVo } from '../utils/mapper.util';
import { MockEndpointVo } from '../vo/mock-endpoint.vo';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@Controller('mock-endpoints')
@ApiTags('Mock Endpoints')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MockController {
  constructor(private readonly mockService: MockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a mock endpoint' })
  @ApiCreatedResponse({ type: () => Object })
  async create(@Body() dto: CreateMockEndpointDto): Promise<MockEndpointVo> {
    const res = await this.mockService.create(dto);
    return mapToVo(res);
  }

  @Get()
  @ApiOperation({ summary: 'List mock endpoints' })
  @ApiOkResponse({ type: () => [Object] })
  async list(): Promise<MockEndpointVo[]> {
    const rows = await this.mockService.list();
    return rows.map(mapToVo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mock endpoint by id' })
  @ApiOkResponse({ type: () => Object })
  async get(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.findById(id);
    return r ? mapToVo(r) : null;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a mock endpoint' })
  @ApiOkResponse({ type: () => Object })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMockEndpointDto,
  ): Promise<MockEndpointVo | null> {
    const r = await this.mockService.update(id, dto);
    return r ? mapToVo(r) : null;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a mock endpoint' })
  @ApiOkResponse({ type: () => Object })
  async remove(@Param('id') id: string) {
    return this.mockService.remove(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable a mock endpoint' })
  @ApiOkResponse({ type: () => Object })
  async enable(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.enable(id);
    return r ? mapToVo(r) : null;
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable a mock endpoint' })
  @ApiOkResponse({ type: () => Object })
  async disable(@Param('id') id: string): Promise<MockEndpointVo | null> {
    const r = await this.mockService.disable(id);
    return r ? mapToVo(r) : null;
  }

  @Post('clear-cache')
  @ApiOperation({ summary: 'Clear mock cache' })
  @ApiOkResponse({ type: () => Object })
  async clearCache() {
    return this.mockService.clearCache();
  }
}

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';

export class CreateMockEndpointDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Matches(/^\/[a-zA-Z0-9/:_-]*$/)
  path: string;

  @IsEnum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'] as any)
  method: HttpMethod = 'GET';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true as any;

  @IsInt()
  @Min(100)
  @Max(599)
  statusCode: number = 200;

  @IsInt()
  @Min(0)
  @Max(10000)
  delay: number = 0;

  @IsString()
  responseTemplate: string;

  @IsOptional()
  headers?: any;

  @IsOptional()
  validation?: any;
}

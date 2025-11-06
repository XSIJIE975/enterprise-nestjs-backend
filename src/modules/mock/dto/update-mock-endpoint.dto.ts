import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateMockEndpointDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  delay?: number;

  @IsOptional()
  @IsString()
  responseTemplate?: string;

  @IsOptional()
  headers?: any;

  @IsOptional()
  validation?: any;
}

import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional() @IsInt() @Min(2000) @Max(2100)
  year?: number;

  @IsOptional() @IsInt() @Min(1) @Max(12)
  month?: number;

  @IsOptional() @IsString()
  area?: string;

  @IsOptional() @IsString()
  projectName?: string;

  @IsOptional() @IsString()
  client?: string;

  @IsOptional() @IsString()
  plant?: string;

  @IsOptional() @IsString()
  poNumber?: string;

  @IsOptional() @IsString()
  projectId?: string;

  @IsOptional() @IsString()
  bidNumber?: string;

  @IsOptional() @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

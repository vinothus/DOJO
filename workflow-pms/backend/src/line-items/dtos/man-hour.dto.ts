import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkflowStage } from '@prisma/client';

export class CreateManHourDto {
  @IsEnum(WorkflowStage)
  stage!: WorkflowStage;

  @IsOptional() @Type(() => Number) @IsInt()
  year?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  month?: number;

  @IsOptional() @IsString()
  shift?: string;

  @IsOptional() @IsDateString()
  workDate?: string;

  @IsOptional() @IsString()
  idNumber?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  employeeName?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  normalHours?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  otHours?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  totalHours?: number;

  @IsOptional() @IsString()
  jobStatus?: string;

  @IsOptional() @IsString()
  approvalStatus?: string;

  @IsOptional() @IsString()
  jobDescription?: string;

  @IsOptional() @IsString()
  rework?: string;
}

export class UpdateManHourDto extends CreateManHourDto {
  @IsInt()
  version!: number;
}

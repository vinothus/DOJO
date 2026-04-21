import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkflowStage } from '@prisma/client';

export class CreateLineItemDto {
  @IsOptional() @IsString()
  inputDrawingNumber?: string;

  @IsOptional() @IsString()
  drawingNumber?: string;

  @IsOptional() @IsString()
  sheetNo?: string;

  @IsOptional() @IsString()
  revNo?: string;

  @IsOptional() @IsString()
  clampType?: string;

  @IsOptional() @IsString()
  material?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  qty?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  unitWeight?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  totalWeight?: number;

  @IsOptional() @IsDateString()
  measurementDate?: string;

  @IsOptional() @IsDateString()
  targetDate?: string;

  @IsEnum(WorkflowStage)
  currentStage!: WorkflowStage;
}

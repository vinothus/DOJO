import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkflowStage } from '@prisma/client';

export class UpdateLineItemDto {
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

  @IsOptional() @IsEnum(WorkflowStage)
  currentStage?: WorkflowStage;

  @IsOptional() @Type(() => Number) @IsNumber()
  invoiceAmountSar?: number;

  @IsOptional()
  @IsObject()
  technicalDetails?: Record<string, unknown>;

  @IsOptional() @IsDateString()
  coordDesignRequestedAt?: string;

  @IsOptional() @IsDateString()
  coordEngineeringSubmittedAt?: string;

  @IsOptional() @IsString()
  coordApprovalStatus?: string;

  @IsOptional() @IsString()
  coordDescription?: string;

  /** Expected row version for optimistic locking */
  @IsInt()
  version!: number;
}

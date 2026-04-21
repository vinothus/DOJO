import { WorkflowStage } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class HandoverDto {
  @IsEnum(WorkflowStage)
  targetStage!: WorkflowStage;

  @IsOptional() @IsString()
  note?: string;
}

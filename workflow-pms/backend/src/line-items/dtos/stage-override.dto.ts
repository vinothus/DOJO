import { WorkflowStage } from '@prisma/client';
import { IsEnum, IsInt, IsString, MinLength } from 'class-validator';

export class StageOverrideDto {
  @IsEnum(WorkflowStage)
  targetStage!: WorkflowStage;

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsInt()
  version!: number;
}

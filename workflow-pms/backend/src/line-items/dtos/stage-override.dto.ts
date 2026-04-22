import { WorkflowStage } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class StageOverrideDto {
  @IsEnum(WorkflowStage)
  targetStage!: WorkflowStage;

  @IsString()
  @MinLength(3)
  reason!: string;

  @IsInt()
  version!: number;

  /** When true (admin only), set project to Complete after the stage change (not the same as Archive) */
  @IsOptional()
  @IsBoolean()
  markProjectComplete?: boolean;
}

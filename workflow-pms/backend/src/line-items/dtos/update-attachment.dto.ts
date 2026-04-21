import { WorkflowStage } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateAttachmentDto {
  @IsOptional()
  @IsEnum(WorkflowStage)
  stage?: WorkflowStage;
}

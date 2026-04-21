import { WorkflowStage } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadAttachmentDto {
  @IsEnum(WorkflowStage)
  stage!: WorkflowStage;
}

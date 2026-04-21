import { WorkflowStage } from '@prisma/client';
export declare class HandoverDto {
    targetStage: WorkflowStage;
    note?: string;
}

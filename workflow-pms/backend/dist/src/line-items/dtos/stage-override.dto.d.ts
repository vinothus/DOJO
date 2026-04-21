import { WorkflowStage } from '@prisma/client';
export declare class StageOverrideDto {
    targetStage: WorkflowStage;
    reason: string;
    version: number;
}

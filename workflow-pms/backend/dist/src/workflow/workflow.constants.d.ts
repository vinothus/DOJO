import { WorkflowStage } from '@prisma/client';
export declare const WORKFLOW_STAGE_ORDER: WorkflowStage[];
export declare function getNextStage(current: WorkflowStage): WorkflowStage | null;

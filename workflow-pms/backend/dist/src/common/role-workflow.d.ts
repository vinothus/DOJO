import { WorkflowStage } from '@prisma/client';
export declare const ROLE_SLUG_TO_STAGE: Record<string, WorkflowStage>;
export declare function stagesForRoles(roleSlugs: string[]): WorkflowStage[];
export declare function isAdmin(roleSlugs: string[]): boolean;

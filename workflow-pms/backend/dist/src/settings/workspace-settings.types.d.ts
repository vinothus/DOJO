import { WorkflowStage } from '@prisma/client';
export type ProjectHeaderFieldKey = 'year' | 'month' | 'area' | 'client' | 'plant' | 'poNumber' | 'bidNumber' | 'projectId';
export type ProjectCreateFieldKey = ProjectHeaderFieldKey | 'projectName';
export type FieldRule = 'required' | 'optional' | 'hidden';
export type WorkspaceTabKey = 'lineDetails' | 'manHours' | 'travel' | 'bom' | 'attachments' | 'coordination' | 'technical';
export interface StageHandoverRule {
    requireTravel?: boolean;
    requireBom?: boolean;
    minAttachments?: number;
    requireManHours?: boolean;
    requireEngineeringWeights?: boolean;
}
export interface HandoverTransitionRule extends Partial<StageHandoverRule> {
    projectHeaderRequired?: Partial<Record<ProjectHeaderFieldKey, boolean>>;
    requireCoordinationFields?: boolean;
    requireSiteMeasurementLineFields?: boolean;
}
export interface WorkspaceSettingsV1 {
    version: 1;
    projectHeaderHandover: Record<ProjectHeaderFieldKey, boolean>;
    projectCreate: Record<ProjectCreateFieldKey, FieldRule>;
    stageTabs: Partial<Record<WorkflowStage, Partial<Record<WorkspaceTabKey, boolean>>>>;
    stageHandover: Partial<Record<WorkflowStage, StageHandoverRule>>;
    handoverTransitions?: Partial<Record<string, HandoverTransitionRule>>;
}
export declare const DEFAULT_WORKSPACE: WorkspaceSettingsV1;
export declare function mergeWorkspace(fromDb: unknown): WorkspaceSettingsV1;
export declare function tabVisible(settings: WorkspaceSettingsV1, stage: WorkflowStage, tab: WorkspaceTabKey): boolean;
export declare function patchWorkspace(current: WorkspaceSettingsV1, patch: unknown): WorkspaceSettingsV1;

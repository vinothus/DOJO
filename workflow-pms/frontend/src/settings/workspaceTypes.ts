import type { WorkflowStage } from '../types';

export type WorkspaceTabKey =
  | 'lineDetails'
  | 'manHours'
  | 'travel'
  | 'bom'
  | 'attachments'
  | 'coordination'
  | 'technical';

export type ProjectHeaderHandoverKeys =
  | 'year'
  | 'month'
  | 'area'
  | 'client'
  | 'plant'
  | 'poNumber'
  | 'bidNumber'
  | 'projectId';

export type StageHandoverRule = {
  requireTravel?: boolean;
  requireBom?: boolean;
  minAttachments?: number;
  requireManHours?: boolean;
  requireEngineeringWeights?: boolean;
};

/** Key: `FROM_STAGE__TO_STAGE` — merged with stage defaults for that handover */
export type HandoverTransitionRule = Partial<StageHandoverRule> & {
  projectHeaderRequired?: Partial<Record<ProjectHeaderHandoverKeys, boolean>>;
  requireCoordinationFields?: boolean;
  requireSiteMeasurementLineFields?: boolean;
};

export type WorkspaceSettingsV1 = {
  version: 1;
  projectHeaderHandover: Record<ProjectHeaderHandoverKeys, boolean>;
  projectCreate: Record<string, 'required' | 'optional' | 'hidden'>;
  stageTabs: Partial<Record<WorkflowStage, Partial<Record<WorkspaceTabKey, boolean>>>>;
  stageHandover?: Partial<Record<WorkflowStage, StageHandoverRule>>;
  handoverTransitions?: Record<string, HandoverTransitionRule>;
};

const TAB_ORDER: WorkspaceTabKey[] = [
  'lineDetails',
  'manHours',
  'travel',
  'bom',
  'attachments',
  'coordination',
  'technical',
];

export function tabOrder(): WorkspaceTabKey[] {
  return TAB_ORDER;
}

export function isWorkspaceTabVisible(
  settings: WorkspaceSettingsV1 | undefined,
  stage: WorkflowStage,
  tab: WorkspaceTabKey,
): boolean {
  if (!settings) return true;
  const per = settings.stageTabs[stage];
  if (per && per[tab] === false) return false;
  return true;
}

export function visibleWorkspaceTabs(
  settings: WorkspaceSettingsV1 | undefined,
  stage: WorkflowStage,
): WorkspaceTabKey[] {
  return TAB_ORDER.filter((t) => isWorkspaceTabVisible(settings, stage, t));
}

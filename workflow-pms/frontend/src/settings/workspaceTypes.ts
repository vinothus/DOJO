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

export type WorkspaceTabAccessMode = 'inherit' | 'hidden' | 'view' | 'edit';

export type WorkspaceSettingsV1 = {
  version: 1;
  projectHeaderHandover: Record<ProjectHeaderHandoverKeys, boolean>;
  projectCreate: Record<string, 'required' | 'optional' | 'hidden'>;
  stageTabs: Partial<Record<WorkflowStage, Partial<Record<WorkspaceTabKey, boolean>>>>;
  /** Per role slug (not `admin`). Omitted entry for a role = legacy tab behavior. */
  roleTabAccess?: Partial<
    Record<string, Partial<Record<WorkspaceTabKey, WorkspaceTabAccessMode>>>
  >;
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

export const WORKSPACE_TAB_LABEL: Record<WorkspaceTabKey, string> = {
  lineDetails: 'Job details',
  manHours: 'Man hours',
  travel: 'Travel',
  bom: 'BOM',
  attachments: 'Attachments',
  coordination: 'Co-ordination',
  technical: 'Technical / RFQ',
};

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

function mergeTabAccessModes(
  modes: WorkspaceTabAccessMode[],
): WorkspaceTabAccessMode {
  if (modes.every((m) => m === 'inherit')) return 'inherit';
  const exp = modes.filter((m) => m !== 'inherit');
  if (exp.some((m) => m === 'edit')) return 'edit';
  if (exp.some((m) => m === 'view')) return 'view';
  return 'hidden';
}

/**
 * Resolves per-tab access for a user. Admins always get `edit` on every tab.
 * When a role has a non-empty `roleTabAccess[role]`, unlisted tabs are `hidden` for that role.
 */
export function mergeTabAccessForUser(
  settings: WorkspaceSettingsV1 | undefined,
  userRoles: string[],
  tab: WorkspaceTabKey,
): WorkspaceTabAccessMode {
  if (userRoles.includes('admin')) return 'edit';
  const map = settings?.roleTabAccess;
  if (!map || Object.keys(map).length === 0) return 'inherit';
  const modes: WorkspaceTabAccessMode[] = [];
  for (const role of userRoles) {
    const per = map[role];
    if (!per || Object.keys(per).length === 0) {
      modes.push('inherit');
      continue;
    }
    const m = per[tab] ?? 'hidden';
    modes.push(m);
  }
  return mergeTabAccessModes(modes);
}

export function visibleWorkspaceTabsForUser(
  settings: WorkspaceSettingsV1 | undefined,
  stage: WorkflowStage,
  roles: string[],
): WorkspaceTabKey[] {
  return TAB_ORDER.filter((t) => {
    if (!isWorkspaceTabVisible(settings, stage, t)) return false;
    return mergeTabAccessForUser(settings, roles, t) !== 'hidden';
  });
}

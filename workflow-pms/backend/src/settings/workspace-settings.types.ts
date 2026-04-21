import { WorkflowStage } from '@prisma/client';

export type ProjectHeaderFieldKey =
  | 'year'
  | 'month'
  | 'area'
  | 'client'
  | 'plant'
  | 'poNumber'
  | 'bidNumber'
  | 'projectId';

export type ProjectCreateFieldKey = ProjectHeaderFieldKey | 'projectName';

export type FieldRule = 'required' | 'optional' | 'hidden';

/** Workspace line-item tab keys (coordination panel only relevant at COORDINATION stage). */
export type WorkspaceTabKey =
  | 'lineDetails'
  | 'manHours'
  | 'travel'
  | 'bom'
  | 'attachments'
  | 'coordination'
  | 'technical';

export interface StageHandoverRule {
  requireTravel?: boolean;
  requireBom?: boolean;
  minAttachments?: number;
  requireManHours?: boolean;
  /** Engineering-style header checks (weights) */
  requireEngineeringWeights?: boolean;
}

/**
 * Overrides for one transition (fromStage → toStage). Key in JSON: `FROM__TO`
 * e.g. `INPUT_SITE_MEASUREMENT__DESIGNING_ENGINEERING`.
 * Merged on top of `stageHandover[fromStage]` and defaults.
 */
export interface HandoverTransitionRule extends Partial<StageHandoverRule> {
  /** Merged onto global `projectHeaderHandover` for this transition only */
  projectHeaderRequired?: Partial<Record<ProjectHeaderFieldKey, boolean>>;
  /** When exiting COORDINATION; default true */
  requireCoordinationFields?: boolean;
  /** Site measurement line fields (drawings, qty, dates…); default true */
  requireSiteMeasurementLineFields?: boolean;
}

export interface WorkspaceSettingsV1 {
  version: 1;
  projectHeaderHandover: Record<ProjectHeaderFieldKey, boolean>;
  projectCreate: Record<ProjectCreateFieldKey, FieldRule>;
  /** false = tab hidden while line is in this stage */
  stageTabs: Partial<
    Record<WorkflowStage, Partial<Record<WorkspaceTabKey, boolean>>>
  >;
  stageHandover: Partial<Record<WorkflowStage, StageHandoverRule>>;
  /** Per outgoing handover (from → next stage). Keys: `FROM__TO` */
  handoverTransitions?: Partial<Record<string, HandoverTransitionRule>>;
}

function allHeaderRequiredTrue(): Record<ProjectHeaderFieldKey, boolean> {
  return {
    year: true,
    month: true,
    area: true,
    client: true,
    plant: true,
    poNumber: true,
    bidNumber: true,
    projectId: true,
  };
}

/** Baseline — matches legacy hardcoded gates; admin can relax via JSON. */
export const DEFAULT_WORKSPACE: WorkspaceSettingsV1 = {
  version: 1,
  projectHeaderHandover: allHeaderRequiredTrue(),
  projectCreate: {
    projectName: 'required',
    projectId: 'optional',
    year: 'optional',
    month: 'optional',
    area: 'optional',
    client: 'optional',
    plant: 'optional',
    poNumber: 'optional',
    bidNumber: 'optional',
  },
  stageTabs: {
    INPUT_SITE_MEASUREMENT: { bom: false },
  },
  stageHandover: {
    INPUT_SITE_MEASUREMENT: {
      requireTravel: true,
      requireBom: false,
      minAttachments: 1,
      requireManHours: true,
    },
    DESIGNING_ENGINEERING: {
      requireTravel: false,
      requireBom: true,
      minAttachments: 0,
      requireManHours: true,
      requireEngineeringWeights: true,
    },
    COORDINATION: {
      requireTravel: false,
      requireBom: false,
      minAttachments: 0,
      requireManHours: false,
    },
    FABRICATION_SHOP: {
      requireTravel: true,
      requireBom: false,
      minAttachments: 0,
      requireManHours: true,
    },
    MACHINING_SHOP: {
      requireTravel: false,
      requireBom: false,
      minAttachments: 1,
      requireManHours: true,
    },
    WAREHOUSE_STORE: {
      requireTravel: false,
      requireBom: false,
      minAttachments: 0,
      requireManHours: true,
    },
    TRANSPORT: {
      requireTravel: true,
      requireBom: false,
      minAttachments: 0,
      requireManHours: true,
    },
    SITE_INSTALLATION: {
      requireTravel: false,
      requireBom: false,
      minAttachments: 1,
      requireManHours: true,
    },
    INVOICE: {},
  },
};

export function mergeWorkspace(
  fromDb: unknown,
): WorkspaceSettingsV1 {
  const base: WorkspaceSettingsV1 = structuredClone(DEFAULT_WORKSPACE);
  if (!fromDb || typeof fromDb !== 'object' || Array.isArray(fromDb)) {
    return base;
  }
  const o = fromDb as Record<string, unknown>;
  if (o.version === 1) {
    if (o.projectHeaderHandover && typeof o.projectHeaderHandover === 'object') {
      base.projectHeaderHandover = {
        ...base.projectHeaderHandover,
        ...(o.projectHeaderHandover as Record<string, boolean>),
      };
    }
    if (o.projectCreate && typeof o.projectCreate === 'object') {
      base.projectCreate = {
        ...base.projectCreate,
        ...(o.projectCreate as Record<string, FieldRule>),
      };
    }
    if (o.stageTabs && typeof o.stageTabs === 'object') {
      for (const [k, v] of Object.entries(
        o.stageTabs as Record<string, unknown>,
      )) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          base.stageTabs[k as WorkflowStage] = {
            ...(base.stageTabs[k as WorkflowStage] ?? {}),
            ...(v as Record<string, boolean>),
          };
        }
      }
    }
    if (o.stageHandover && typeof o.stageHandover === 'object') {
      for (const [k, v] of Object.entries(
        o.stageHandover as Record<string, StageHandoverRule>,
      )) {
        base.stageHandover[k as WorkflowStage] = {
          ...(base.stageHandover[k as WorkflowStage] ?? {}),
          ...v,
        };
      }
    }
    if (o.handoverTransitions && typeof o.handoverTransitions === 'object') {
      base.handoverTransitions = { ...(base.handoverTransitions ?? {}) };
      for (const [k, v] of Object.entries(
        o.handoverTransitions as Record<string, HandoverTransitionRule>,
      )) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          base.handoverTransitions[k] = {
            ...(base.handoverTransitions[k] ?? {}),
            ...v,
          };
        }
      }
    }
  }
  return base;
}

export function tabVisible(
  settings: WorkspaceSettingsV1,
  stage: WorkflowStage,
  tab: WorkspaceTabKey,
): boolean {
  const per = settings.stageTabs[stage];
  if (per && per[tab] === false) return false;
  if (per && per[tab] === true) return true;
  return true;
}

/** Deep-merge admin PATCH onto current effective settings (both are full V1 shapes). */
export function patchWorkspace(
  current: WorkspaceSettingsV1,
  patch: unknown,
): WorkspaceSettingsV1 {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return current;
  }
  const p = patch as Partial<WorkspaceSettingsV1>;
  const out = structuredClone(current);
  if (p.projectHeaderHandover) {
    Object.assign(out.projectHeaderHandover, p.projectHeaderHandover);
  }
  if (p.projectCreate) {
    Object.assign(out.projectCreate, p.projectCreate);
  }
  if (p.stageTabs) {
    for (const [k, v] of Object.entries(p.stageTabs)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.stageTabs[k as WorkflowStage] = {
          ...(out.stageTabs[k as WorkflowStage] ?? {}),
          ...(v as Record<string, boolean>),
        };
      }
    }
  }
  if (p.stageHandover) {
    for (const [k, v] of Object.entries(p.stageHandover)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.stageHandover[k as WorkflowStage] = {
          ...(out.stageHandover[k as WorkflowStage] ?? {}),
          ...(v as StageHandoverRule),
        };
      }
    }
  }
  if (p.handoverTransitions) {
    out.handoverTransitions = { ...(out.handoverTransitions ?? {}) };
    for (const [k, v] of Object.entries(p.handoverTransitions)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.handoverTransitions[k] = {
          ...(out.handoverTransitions[k] ?? {}),
          ...(v as HandoverTransitionRule),
        };
      }
    }
  }
  return out;
}

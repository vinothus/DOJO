import type { WorkflowStage } from '../types';

export const ROLE_TO_STAGE: Record<string, WorkflowStage> = {
  site_measurement: 'INPUT_SITE_MEASUREMENT',
  engineering: 'DESIGNING_ENGINEERING',
  coordinator: 'COORDINATION',
  fab_shop: 'FABRICATION_SHOP',
  machining: 'MACHINING_SHOP',
  warehouse: 'WAREHOUSE_STORE',
  transport: 'TRANSPORT',
  site_installation: 'SITE_INSTALLATION',
  invoice: 'INVOICE',
};

export function stagesForUserRoles(roles: string[]): WorkflowStage[] {
  const s = new Set<WorkflowStage>();
  for (const r of roles) {
    const st = ROLE_TO_STAGE[r];
    if (st) s.add(st);
  }
  return [...s];
}

/** User may edit rows tied to this workflow stage (man-hours, travel for that stage, etc.) */
export function canEditWorkflowStage(roles: string[], stage: WorkflowStage): boolean {
  if (roles.includes('admin')) return true;
  return stagesForUserRoles(roles).includes(stage);
}

/** User may edit line header fields (PATCH line) only when the line sits on their stage */
export function canEditLineHeader(roles: string[], lineCurrentStage: WorkflowStage): boolean {
  if (roles.includes('admin')) return true;
  return stagesForUserRoles(roles).includes(lineCurrentStage);
}

export function canAddBom(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('engineering');
}

/** Create projects and first jobs (site intake). */
export function canCreateProjects(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('site_measurement');
}

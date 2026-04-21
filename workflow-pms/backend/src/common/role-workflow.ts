import { WorkflowStage } from '@prisma/client';

/** Maps department role slug → workflow stage they own */
export const ROLE_SLUG_TO_STAGE: Record<string, WorkflowStage> = {
  site_measurement: WorkflowStage.INPUT_SITE_MEASUREMENT,
  engineering: WorkflowStage.DESIGNING_ENGINEERING,
  coordinator: WorkflowStage.COORDINATION,
  fab_shop: WorkflowStage.FABRICATION_SHOP,
  machining: WorkflowStage.MACHINING_SHOP,
  warehouse: WorkflowStage.WAREHOUSE_STORE,
  transport: WorkflowStage.TRANSPORT,
  site_installation: WorkflowStage.SITE_INSTALLATION,
  invoice: WorkflowStage.INVOICE,
};

export function stagesForRoles(roleSlugs: string[]): WorkflowStage[] {
  const out = new Set<WorkflowStage>();
  for (const r of roleSlugs) {
    const s = ROLE_SLUG_TO_STAGE[r];
    if (s) out.add(s);
  }
  return [...out];
}

export function isAdmin(roleSlugs: string[]): boolean {
  return roleSlugs.includes('admin');
}

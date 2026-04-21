import { WorkflowStage } from '@prisma/client';

/** Canonical order — handover advances exactly one step forward */
export const WORKFLOW_STAGE_ORDER: WorkflowStage[] = [
  WorkflowStage.INPUT_SITE_MEASUREMENT,
  WorkflowStage.DESIGNING_ENGINEERING,
  WorkflowStage.COORDINATION,
  WorkflowStage.FABRICATION_SHOP,
  WorkflowStage.MACHINING_SHOP,
  WorkflowStage.WAREHOUSE_STORE,
  WorkflowStage.TRANSPORT,
  WorkflowStage.SITE_INSTALLATION,
  WorkflowStage.INVOICE,
];

export function getNextStage(current: WorkflowStage): WorkflowStage | null {
  const i = WORKFLOW_STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= WORKFLOW_STAGE_ORDER.length - 1) return null;
  return WORKFLOW_STAGE_ORDER[i + 1]!;
}

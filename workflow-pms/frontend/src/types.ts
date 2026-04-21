export type WorkflowStage =
  | 'INPUT_SITE_MEASUREMENT'
  | 'DESIGNING_ENGINEERING'
  | 'COORDINATION'
  | 'FABRICATION_SHOP'
  | 'MACHINING_SHOP'
  | 'WAREHOUSE_STORE'
  | 'TRANSPORT'
  | 'SITE_INSTALLATION'
  | 'INVOICE';

export const STAGE_LABEL: Record<WorkflowStage, string> = {
  INPUT_SITE_MEASUREMENT: 'Input — Site measurement',
  DESIGNING_ENGINEERING: 'Designing & Engineering',
  COORDINATION: 'Co-ordination',
  FABRICATION_SHOP: 'Fabrication shop',
  MACHINING_SHOP: 'Machining shop',
  WAREHOUSE_STORE: 'Warehouse / Store',
  TRANSPORT: 'Transport',
  SITE_INSTALLATION: 'Site installation',
  INVOICE: 'Invoice',
};

export const ALL_STAGES: WorkflowStage[] = [
  'INPUT_SITE_MEASUREMENT',
  'DESIGNING_ENGINEERING',
  'COORDINATION',
  'FABRICATION_SHOP',
  'MACHINING_SHOP',
  'WAREHOUSE_STORE',
  'TRANSPORT',
  'SITE_INSTALLATION',
  'INVOICE',
];

/** Next stage in pipeline, or null at Invoice */
export function getNextStage(current: WorkflowStage): WorkflowStage | null {
  const i = ALL_STAGES.indexOf(current);
  if (i < 0 || i >= ALL_STAGES.length - 1) return null;
  return ALL_STAGES[i + 1]!;
}

/** Short hint for dashboard by backend role slug */
export const ROLE_DASHBOARD_HINT: Record<string, string> = {
  admin:
    'Full access: all workflow stages, create projects & jobs, reports, and stage overrides.',
  site_measurement:
    'Your workflow column: Input — Site measurement. Open a project to work on jobs in your stage.',
  engineering:
    'Your workflow column: Designing & Engineering. You see and edit jobs only in that stage.',
  coordinator:
    'Your workflow column: Co-ordination (between Engineering and Fabrication). Track design request/submittal dates and approval.',
  fab_shop: 'Your workflow column: Fabrication shop. Open projects to update fab-stage jobs.',
  machining: 'Your workflow column: Machining shop.',
  warehouse: 'Your workflow column: Warehouse / Store.',
  transport: 'Your workflow column: Transport.',
  site_installation: 'Your workflow column: Site installation.',
  invoice: 'Your workflow column: Invoice.',
};

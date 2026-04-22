import { PrismaClient, WorkflowStage } from '@prisma/client';

const MARKER_PROJECT_ID = 'PRJ-COORD-2026-DEMO';

/**
 * Idempotent: one project + line sitting in **Co-ordination** so coordinator@example.com
 * sees work in their queue (sample portfolio had no COORDINATION stage).
 */
export async function ensureCoordinationPhaseSample(
  prisma: PrismaClient,
  adminUserId: string,
): Promise<void> {
  const existing = await prisma.project.findUnique({
    where: { projectId: MARKER_PROJECT_ID },
  });
  if (existing) {
    console.log(`Co-ordination demo already present (${MARKER_PROJECT_ID}).`);
    return;
  }

  const baseYear = 2026;
  const baseMonth = 4;

  const project = await prisma.project.create({
    data: {
      projectId: MARKER_PROJECT_ID,
      projectName: 'Co-ordination demo — eng. to fab handoff',
      client: 'Demo Client — Co-ordination queue',
      plant: 'Main shop',
      area: 'Eastern Province',
      year: baseYear,
      month: baseMonth,
      poNumber: 'PO-COORD-DEMO-001',
      bidNumber: 'BID-COORD-2026-001',
      createdById: adminUserId,
    },
  });

  const line = await prisma.lineItem.create({
    data: {
      projectId: project.id,
      drawingNumber: 'DWG-COORD-DEMO-01',
      inputDrawingNumber: 'IN-COORD-9001',
      sheetNo: '1',
      revNo: 'B',
      clampType: 'Standard',
      material: 'Carbon steel',
      description:
        'Demo job in co-ordination — use co-ordination tab for dates, approval, and handover to fabrication',
      qty: 1,
      unitWeight: 85,
      totalWeight: 85,
      measurementDate: new Date('2026-03-20'),
      targetDate: new Date('2026-10-15'),
      currentStage: WorkflowStage.COORDINATION,
      coordDesignRequestedAt: new Date('2026-04-01'),
      coordEngineeringSubmittedAt: new Date('2026-04-08'),
      coordApprovalStatus: 'Pending fabric release',
      coordDescription: 'Awaiting final co-ordination sign-off before fabrication start.',
      technicalDetails: {
        designTemp: '200°C',
        operatingTemp: '150°C',
        designPressure: '10 barg',
        operatingPressure: '6 barg',
        carrier: 'Steam',
        lineEquipment: 'COORD-DEMO-LINE-01',
        sealant: 'Graphite',
        designRemarks: 'Seeded demo for co-ordinator role',
      },
    },
  });

  await prisma.manHourEntry.create({
    data: {
      lineItemId: line.id,
      stage: WorkflowStage.COORDINATION,
      year: baseYear,
      month: baseMonth,
      workDate: new Date('2026-04-10'),
      normalHours: 6,
      totalHours: 6,
      jobStatus: 'Active',
      jobDescription: 'Co-ordination review — demo row',
      approvalStatus: 'In review',
    },
  });

  console.log(
    `Co-ordination demo seeded: ${MARKER_PROJECT_ID} — log in as coordinator@example.com to view.`,
  );
}

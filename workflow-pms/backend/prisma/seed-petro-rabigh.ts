import { Prisma, PrismaClient, WorkflowStage } from '@prisma/client';

/** Petro Rabigh Yanbu — 4 projects from RFQ spreadsheet (idempotent). */
export async function ensurePetroRabighPortfolio(
  prisma: PrismaClient,
  adminUserId: string,
): Promise<void> {
  const idem = await prisma.project.findUnique({
    where: { projectId: 'PRJ-YANBU-2026-001' },
  });
  if (idem) {
    console.log('Petro Rabigh Yanbu portfolio already present (PRJ-YANBU-2026-001 exists).');
    return;
  }

  const baseYear = 2026;
  const baseMonth = 4;

  type Tech = Record<string, unknown>;

  const projects: {
    projectId: string;
    projectName: string;
    bidNumber: string;
    plant: string;
    poNumber: string;
    line: {
      inputDrawingNumber: string;
      drawingNumber: string;
      sheetNo: string;
      revNo: string;
      clampType: string;
      material: string;
      description: string;
      qty: number;
      unitWeight: number;
      totalWeight: number;
      measurementDate: Date;
      targetDate: Date;
      currentStage: WorkflowStage;
      invoiceAmountSar?: number;
      technicalDetails: Tech;
    };
    seedEngineering: boolean;
    seedInvoice: boolean;
  }[] = [
    {
      projectId: 'PRJ-YANBU-2026-001',
      projectName: '∅10" Flange Enclosure Clamp (C.S)',
      bidNumber: 'Y-1386',
      plant: 'VGS R-250',
      poNumber: 'BC-9014-2026',
      seedEngineering: true,
      seedInvoice: false,
      line: {
        inputDrawingNumber: 'BC-9014-2026',
        drawingNumber: '1',
        sheetNo: '1',
        revNo: '1',
        clampType: 'Flange enclosure',
        material: 'CS',
        description: '∅10" Flange Enclosure Clamp (C.S)',
        qty: 1,
        unitWeight: 68,
        totalWeight: 68,
        measurementDate: new Date('2026-04-01'),
        targetDate: new Date('2026-12-31'),
        currentStage: WorkflowStage.DESIGNING_ENGINEERING,
        technicalDetails: {
          slNo: 1,
          location: 'YANBU',
          wbs: '',
          lineStatus: '',
          designRemarks: 'Design completed',
          designTemp: '321°C',
          operatingTemp: '290°C',
          designPressure: '19.4 Kg/cm²',
          operatingPressure: '12.7 Kg/cm²',
          carrier: 'DIESEL',
          lineEquipment: 'EIV-0093',
          sealant: '6C',
          designReceivedDate: '2026-04-01',
          designSubmittedDate: '2026-04-01',
          designApprovedDate: '',
          priority: '',
          fabRequestNo: '',
          fabStartDate: '',
          fabTargetDate: '',
          fabLeadName: '',
          cutting: '',
          machine: '',
          fitUp: '',
          welding: '',
          finalMachining: '',
          qaQc: '',
          qcCompleteDate: '',
        },
      },
    },
    {
      projectId: 'PRJ-YANBU-2026-002',
      projectName: 'Ø1-1/2" ELBOW & FLANGE BOX CLAMP',
      bidNumber: 'Y-1388',
      plant: 'R242',
      poNumber: 'BC-9020-2026',
      seedEngineering: false,
      seedInvoice: true,
      line: {
        inputDrawingNumber: 'BC-9020-2026',
        drawingNumber: '2',
        sheetNo: '1',
        revNo: '1',
        clampType: 'Elbow & flange box',
        material: 'CS',
        description: 'Ø1-1/2" ELBOW & FLANGE BOX CLAMP',
        qty: 1,
        unitWeight: 19,
        totalWeight: 19,
        measurementDate: new Date('2026-02-01'),
        targetDate: new Date('2026-03-14'),
        currentStage: WorkflowStage.INVOICE,
        invoiceAmountSar: 285_500,
        technicalDetails: {
          slNo: 2,
          location: 'YANBU',
          wbs: 'ASHP2403640327',
          lineStatus: 'Fabrication',
          designRemarks: 'Fabrication',
          designTemp: '200°C',
          operatingTemp: '158°C',
          designPressure: '6 Kg/cm²',
          operatingPressure: '5 Kg/cm²',
          carrier: 'HP CONDENSATE',
          lineEquipment: 'R242-E-0007/ 1"-HC-R242-002-1CS1P05-IH',
          sealant: '1/2A',
          designReceivedDate: '2026-04-16',
          designSubmittedDate: '2026-04-16',
          designApprovedDate: '',
          priority: '',
          fabRequestNo: '051/26',
          fabStartDate: '2026-03-11',
          fabTargetDate: '2026-03-14',
          fabLeadName: 'SUNIL',
          cutting: 'COMPLETED',
          machine: 'COMPLETED',
          fitUp: 'COMPLETED',
          welding: 'COMPLETED',
          finalMachining: 'COMPLETED',
          qaQc: 'COMPLETED',
          qcCompleteDate: '2026-03-16',
        },
      },
    },
    {
      projectId: 'PRJ-YANBU-2026-003',
      projectName: 'Ø1" Valve enclosure clamp (S.S)',
      bidNumber: 'Y-1390',
      plant: 'Phenol',
      poNumber: 'BC-9022-2026',
      seedEngineering: true,
      seedInvoice: false,
      line: {
        inputDrawingNumber: 'BC-9022-2026',
        drawingNumber: '1',
        sheetNo: '1',
        revNo: '1',
        clampType: 'Valve enclosure',
        material: 'SS',
        description: "Ø1'' VALVE ENCLOSURE CLAMP (S.S)CL",
        qty: 1,
        unitWeight: 19,
        totalWeight: 19,
        measurementDate: new Date('2026-03-01'),
        targetDate: new Date('2026-12-31'),
        currentStage: WorkflowStage.DESIGNING_ENGINEERING,
        technicalDetails: {
          slNo: 3,
          location: 'YANBU',
          wbs: '',
          lineStatus: '',
          designRemarks: 'Design completed',
          designTemp: '90°C',
          operatingTemp: '46°C',
          designPressure: '12 Kg/cm²',
          operatingPressure: '7.2 Kg/cm²',
          carrier: 'SULPURIC ACID',
          lineEquipment: 'P250-FV-2921 D/S',
          sealant: '9E',
          designReceivedDate: '2026-03-11',
          designSubmittedDate: '2026-03-11',
          designApprovedDate: '',
          priority: '',
          fabRequestNo: '',
          fabStartDate: '',
          fabTargetDate: '',
          fabLeadName: '',
          cutting: '',
          machine: '',
          fitUp: '',
          welding: '',
          finalMachining: '',
          qaQc: '',
          qcCompleteDate: '',
        },
      },
    },
    {
      projectId: 'PRJ-YANBU-2026-004',
      projectName: '∅6" Flange ring clamp (C.S)',
      bidNumber: 'Y-1398',
      plant: 'R240',
      poNumber: 'RC-9043-2026',
      seedEngineering: false,
      seedInvoice: true,
      line: {
        inputDrawingNumber: 'RC-9043-2026',
        drawingNumber: '2',
        sheetNo: '1',
        revNo: '1',
        clampType: 'Flange ring clamp',
        material: 'CS',
        description: "∅6'' FLANGE RING CLAMP (C.S)",
        qty: 1,
        unitWeight: 23,
        totalWeight: 23,
        measurementDate: new Date('2026-02-15'),
        targetDate: new Date('2026-03-05'),
        currentStage: WorkflowStage.INVOICE,
        invoiceAmountSar: 312_750.5,
        technicalDetails: {
          slNo: 4,
          location: 'YANBU',
          wbs: 'ASHP2403640324',
          lineStatus: 'Fabrication',
          designRemarks: 'Fabrication',
          designTemp: '310°C',
          operatingTemp: '265°C',
          designPressure: '17 Kg/cm²',
          operatingPressure: '6.7 Kg/cm²',
          carrier: 'FRESH FEED VGO',
          lineEquipment: '6"-PR-R230-009-3CC2P01-IH',
          sealant: 'NES2HA',
          designReceivedDate: '2026-03-02',
          designSubmittedDate: '2026-03-02',
          designApprovedDate: '',
          priority: '',
          fabRequestNo: '046/26',
          fabStartDate: '2026-03-05',
          fabTargetDate: '2026-03-05',
          fabLeadName: 'MURUGAN',
          cutting: 'COMPLETED',
          machine: 'COMPLETED',
          fitUp: 'COMPLETED',
          welding: 'COMPLETED',
          finalMachining: 'COMPLETED',
          qaQc: 'COMPLETED',
          qcCompleteDate: '2026-03-07',
        },
      },
    },
  ];

  for (const p of projects) {
    const proj = await prisma.project.create({
      data: {
        projectId: p.projectId,
        projectName: p.projectName,
        year: baseYear,
        month: baseMonth,
        area: 'YANBU',
        client: 'PETRO RABIGH',
        plant: p.plant,
        poNumber: p.poNumber,
        bidNumber: p.bidNumber,
        createdById: adminUserId,
      },
    });

    const line = await prisma.lineItem.create({
      data: {
        projectId: proj.id,
        inputDrawingNumber: p.line.inputDrawingNumber,
        drawingNumber: p.line.drawingNumber,
        sheetNo: p.line.sheetNo,
        revNo: p.line.revNo,
        clampType: p.line.clampType,
        material: p.line.material,
        description: p.line.description,
        qty: p.line.qty,
        unitWeight: p.line.unitWeight,
        totalWeight: p.line.totalWeight,
        measurementDate: p.line.measurementDate,
        targetDate: p.line.targetDate,
        currentStage: p.line.currentStage,
        invoiceAmountSar: p.line.invoiceAmountSar,
        technicalDetails: p.line.technicalDetails as Prisma.InputJsonValue,
      },
    });

    if (p.seedEngineering) {
      await prisma.bomLine.create({
        data: {
          lineItemId: line.id,
          year: baseYear,
          month: baseMonth,
          description: `${p.line.description} — BOM placeholder`,
          qty: 1,
          materialSpec: p.line.material === 'SS' ? 'ASTM A240 316L' : 'ASTM A36 / CS',
        },
      });
      await prisma.manHourEntry.create({
        data: {
          lineItemId: line.id,
          stage: WorkflowStage.DESIGNING_ENGINEERING,
          year: baseYear,
          month: baseMonth,
          workDate: new Date('2026-04-10'),
          normalHours: 16,
          totalHours: 16,
          jobStatus: 'Active',
          approvalStatus: 'Approved',
          jobDescription: 'Design review & release',
        },
      });
    }

    if (p.seedInvoice) {
      await prisma.manHourEntry.createMany({
        data: [
          {
            lineItemId: line.id,
            stage: WorkflowStage.FABRICATION_SHOP,
            year: baseYear,
            month: 3,
            workDate: new Date('2026-03-12'),
            normalHours: 24,
            totalHours: 24,
            jobStatus: 'Completed',
            jobDescription: 'Fabrication — shop floor',
          },
          {
            lineItemId: line.id,
            stage: WorkflowStage.INVOICE,
            year: baseYear,
            month: 3,
            workDate: new Date('2026-03-16'),
            normalHours: 4,
            totalHours: 4,
            jobStatus: 'Closed',
            jobDescription: 'Invoice preparation',
          },
        ],
      });
    }
  }

  console.log(
    `Petro Rabigh Yanbu: created ${projects.length} projects (PRJ-YANBU-2026-001 … 004).`,
  );
}

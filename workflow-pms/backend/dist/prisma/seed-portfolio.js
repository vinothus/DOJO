"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSamplePortfolio = ensureSamplePortfolio;
const client_1 = require("@prisma/client");
async function ensureSamplePortfolio(prisma, adminUserId) {
    const marker = await prisma.project.findFirst({
        where: { projectId: 'PRJ-GOLD-COMPLETE' },
    });
    if (marker) {
        console.log('Sample portfolio already present (PRJ-GOLD-COMPLETE exists).');
        return;
    }
    const samples = [
        {
            projectId: 'PRJ-SAMPLE-01-JUBAIL-HEAT',
            client: 'Saudi Aramco — Jubail Refinery',
            plant: 'Jubail Eastern Complex',
            area: 'Eastern Province',
            poNumber: 'PO-ARMCO-88421',
            bidNumber: 'BID-JB-2026-014',
            lineStage: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
            drawingNo: 'DWG-JB-SM-001',
            description: 'Crude pre-heat skid — site measurement package',
        },
        {
            projectId: 'PRJ-SAMPLE-02-YANBU-MAN',
            client: 'SABIC — Yanbu Petrochemicals',
            plant: 'Yanbu Industrial City',
            area: 'Madinah Province',
            poNumber: 'PO-SABIC-77210',
            bidNumber: 'BID-YB-2026-022',
            lineStage: client_1.WorkflowStage.DESIGNING_ENGINEERING,
            drawingNo: 'DWG-YB-DE-014',
            description: 'Cooling water manifold — engineering release',
        },
        {
            projectId: 'PRJ-SAMPLE-03-MAADEN-PHOS',
            client: "Ma'aden Wa'ad Al Shamal Phosphate",
            plant: 'Waad Al Shamal',
            area: 'Northern Border',
            poNumber: 'PO-MAA-55102',
            bidNumber: 'BID-WS-2026-009',
            lineStage: client_1.WorkflowStage.FABRICATION_SHOP,
            drawingNo: 'DWG-WS-FAB-003',
            description: 'Conveyor guard set — fabrication in progress',
        },
        {
            projectId: 'PRJ-SAMPLE-04-RAST-HX',
            client: 'Saudi Aramco — Ras Tanura Refinery',
            plant: 'Ras Tanura',
            area: 'Eastern Province',
            poNumber: 'PO-ARMCO-90133',
            bidNumber: 'BID-RT-2026-031',
            lineStage: client_1.WorkflowStage.MACHINING_SHOP,
            drawingNo: 'DWG-RT-MC-201',
            description: 'Heat exchanger frame — machining cell',
        },
        {
            projectId: 'PRJ-SAMPLE-05-SAF-VALVE',
            client: 'Saudi Aramco — Safaniyah GOSP',
            plant: 'Safaniyah Field',
            area: 'Eastern Province',
            poNumber: 'PO-ARMCO-77402',
            bidNumber: 'BID-SF-2026-018',
            lineStage: client_1.WorkflowStage.WAREHOUSE_STORE,
            drawingNo: 'DWG-SF-WH-088',
            description: 'Valve rack assembly — warehouse staging',
        },
        {
            projectId: 'PRJ-SAMPLE-06-JED-PIPE',
            client: 'King Abdullah Economic City — Industrial',
            plant: 'KAEC Logistics',
            area: 'Makkah Province',
            poNumber: 'PO-KAEC-44021',
            bidNumber: 'BID-JD-2026-045',
            lineStage: client_1.WorkflowStage.TRANSPORT,
            drawingNo: 'DWG-JD-TR-112',
            description: 'Pipe rack section — transport to laydown',
        },
        {
            projectId: 'PRJ-SAMPLE-07-NEOM-BEAM',
            client: 'NEOM — Industrial City',
            plant: 'NEOM Bay South',
            area: 'Tabuk',
            poNumber: 'PO-NEOM-33009',
            bidNumber: 'BID-NM-2026-007',
            lineStage: client_1.WorkflowStage.SITE_INSTALLATION,
            drawingNo: 'DWG-NM-SI-404',
            description: 'Structural handrail package — site installation',
        },
        {
            projectId: 'PRJ-SAMPLE-08-DAMMAM-INV',
            client: 'Sadara Chemical — Jubail',
            plant: 'Jubail Chemical Complex',
            area: 'Eastern Province',
            poNumber: 'PO-SAD-66120',
            bidNumber: 'BID-JB-2026-099',
            lineStage: client_1.WorkflowStage.INVOICE,
            drawingNo: 'DWG-JB-INV-201',
            description: 'Pipe support revision — invoicing',
        },
        {
            projectId: 'PRJ-SAMPLE-09-KHOBAR-SURV',
            client: 'Al Fanar — Al Khobar Fabrication',
            plant: 'Khobar Industrial Area',
            area: 'Eastern Province',
            poNumber: 'PO-AFN-22881',
            bidNumber: 'BID-KH-2026-012',
            lineStage: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
            drawingNo: 'DWG-KH-SM-002',
            description: 'Secondary survey — tank pad layout',
        },
    ];
    const baseYear = 2026;
    const baseMonth = 4;
    for (const s of samples) {
        const p = await prisma.project.create({
            data: {
                projectId: s.projectId,
                projectName: s.projectId.replace(/^PRJ-/, '').replace(/-/g, ' '),
                client: s.client,
                plant: s.plant,
                area: s.area,
                year: baseYear,
                month: baseMonth,
                poNumber: s.poNumber,
                bidNumber: s.bidNumber,
                createdById: adminUserId,
            },
        });
        const line = await prisma.lineItem.create({
            data: {
                projectId: p.id,
                drawingNumber: s.drawingNo,
                inputDrawingNumber: `IN-${s.drawingNo}`,
                sheetNo: '1',
                revNo: 'A',
                clampType: 'Standard',
                material: 'Carbon steel',
                description: s.description,
                qty: 1,
                measurementDate: new Date(`${baseYear}-${String(baseMonth).padStart(2, '0')}-01`),
                targetDate: new Date(`${baseYear}-08-31`),
                unitWeight: s.lineStage === client_1.WorkflowStage.DESIGNING_ENGINEERING ? 120 : null,
                totalWeight: s.lineStage === client_1.WorkflowStage.DESIGNING_ENGINEERING ? 120 : null,
                invoiceAmountSar: s.lineStage === client_1.WorkflowStage.INVOICE ? 88500.5 : null,
                currentStage: s.lineStage,
            },
        });
        await prisma.manHourEntry.create({
            data: {
                lineItemId: line.id,
                stage: s.lineStage,
                year: baseYear,
                month: baseMonth,
                workDate: new Date(`${baseYear}-04-15`),
                normalHours: 8,
                totalHours: 8,
                jobStatus: 'Active',
                jobDescription: `${s.projectId} — sample row`,
                ...(s.lineStage === client_1.WorkflowStage.DESIGNING_ENGINEERING
                    ? { approvalStatus: 'Approved' }
                    : {}),
            },
        });
    }
    const gold = await prisma.project.create({
        data: {
            projectId: 'PRJ-GOLD-COMPLETE',
            projectName: 'Gold complete lifecycle demo',
            client: 'ASSA ABLOY Opening Solutions — Industrial Demo',
            plant: 'Riyadh Manufacturing Campus',
            area: 'Riyadh Region',
            poNumber: 'PO-DEMO-GOLD-001',
            bidNumber: 'BID-2026-GOLD-001',
            year: baseYear,
            month: baseMonth,
            createdById: adminUserId,
        },
    });
    const goldLine = await prisma.lineItem.create({
        data: {
            projectId: gold.id,
            drawingNumber: 'DWG-GOLD-MASTER-01',
            inputDrawingNumber: 'IN-GOLD-9001',
            sheetNo: '1',
            revNo: 'C',
            clampType: 'Heavy-duty',
            material: 'Stainless 316L',
            description: 'Gate & automation frame — full lifecycle (reports & cost summary demo)',
            qty: 3,
            measurementDate: new Date('2026-03-10'),
            targetDate: new Date('2026-09-30'),
            unitWeight: 450,
            totalWeight: 1350,
            invoiceAmountSar: 425_750.25,
            currentStage: client_1.WorkflowStage.INVOICE,
        },
    });
    await prisma.bomLine.create({
        data: {
            lineItemId: goldLine.id,
            year: baseYear,
            month: baseMonth,
            description: 'Plate & structural BOM',
            qty: 2,
            materialSpec: 'ASTM A240 316L',
        },
    });
    const mhRows = [
        { stage: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT, normalHours: 12, jobDescription: 'site survey' },
        { stage: client_1.WorkflowStage.DESIGNING_ENGINEERING, normalHours: 40, jobDescription: '3D modelling' },
        {
            stage: client_1.WorkflowStage.FABRICATION_SHOP,
            normalHours: 16,
            jobDescription: 'material cutting — fab',
        },
        { stage: client_1.WorkflowStage.FABRICATION_SHOP, normalHours: 10, jobDescription: 'grinding — fab' },
        { stage: client_1.WorkflowStage.FABRICATION_SHOP, normalHours: 8, jobDescription: 'fitup welding' },
        { stage: client_1.WorkflowStage.MACHINING_SHOP, normalHours: 14, jobDescription: 'shaping — machining' },
        { stage: client_1.WorkflowStage.MACHINING_SHOP, normalHours: 22, jobDescription: 'deep drilling' },
        { stage: client_1.WorkflowStage.WAREHOUSE_STORE, normalHours: 6, jobDescription: 'kit consolidation' },
        { stage: client_1.WorkflowStage.TRANSPORT, normalHours: 4, jobDescription: 'escort load' },
        { stage: client_1.WorkflowStage.SITE_INSTALLATION, normalHours: 18, jobDescription: 'field align' },
        { stage: client_1.WorkflowStage.INVOICE, normalHours: 3, jobDescription: 'invoice support hours' },
    ];
    await prisma.manHourEntry.createMany({
        data: mhRows.map((r, i) => ({
            lineItemId: goldLine.id,
            stage: r.stage,
            year: baseYear,
            month: baseMonth,
            workDate: new Date(`2026-04-${String(10 + i).padStart(2, '0')}`),
            normalHours: r.normalHours,
            totalHours: r.normalHours,
            jobStatus: 'Closed',
            jobDescription: r.jobDescription,
            ...(r.stage === client_1.WorkflowStage.DESIGNING_ENGINEERING
                ? { approvalStatus: 'Approved' }
                : {}),
        })),
    });
    await prisma.travelEntry.createMany({
        data: [
            {
                lineItemId: goldLine.id,
                stage: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
                workDate: new Date('2026-04-11'),
                roundTripKm: 85,
                vehicleType: 'Flatbed',
            },
            {
                lineItemId: goldLine.id,
                stage: client_1.WorkflowStage.FABRICATION_SHOP,
                workDate: new Date('2026-05-02'),
                roundTripKm: 40,
                vehicleType: 'Flatbed',
            },
            {
                lineItemId: goldLine.id,
                stage: client_1.WorkflowStage.TRANSPORT,
                workDate: new Date('2026-06-18'),
                oneWayKm: 220,
                vehicleType: 'Lowbed',
            },
        ],
    });
    await prisma.attachment.create({
        data: {
            lineItemId: goldLine.id,
            stage: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
            filePath: 'seed/gold-complete-readme.txt',
            fileName: 'gold-project-readme.txt',
            mime: 'text/plain',
            sizeBytes: 32,
        },
    });
    console.log('Sample portfolio seeded: 9 stage demos + PRJ-GOLD-COMPLETE (reports / cost summary).');
}
//# sourceMappingURL=seed-portfolio.js.map
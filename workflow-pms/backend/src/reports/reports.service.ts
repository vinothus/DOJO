import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ManHourEntry,
  ProjectStatus,
  TravelEntry,
  WorkflowStage,
} from '@prisma/client';
import { isAdmin, stagesForRoles } from '../common/role-workflow';
import {
  CostingService,
  manHourQuantity,
  num,
} from '../costing/costing.service';
import { PrismaService } from '../prisma/prisma.service';
/** CJS module: default import compiles to `require('pdfkit').default` which is undefined → 500 on PDF. */
import PDFDocument = require('pdfkit');

/** One row per line item — PRD-aligned column names (camelCase JSON) */
export type StatusReportRow = {
  year: number | null;
  month: number | null;
  area: string | null;
  client: string | null;
  plant: string | null;
  poNumber: string | null;
  projectId: string;
  bidNumber: string | null;
  inputDrawingNumber: string | null;
  drawingNumber: string | null;
  sheetNo: string | null;
  revNo: string | null;
  material: string | null;
  clampType: string | null;
  description: string | null;
  qty: number | null;
  unitWeight: number | null;
  totalWeight: number | null;
  measurementDate: string | null;
  targetDate: string | null;
  inputSiteMeasurementManHrs: number;
  designingEngineeringManHrs: number;
  yardToShopTransportHrs: number;
  yardToShopKm: number;
  yardToShopFuelCost: number;
  materialCuttingManHrs: number;
  grindingManHrs: number;
  fitupManHrs: number;
  fitupWeldingManHrs: number;
  fitupInspectionManHrs: number;
  weldingManHrs: number;
  finalGrindingManHrs: number;
  shapingManHrs: number;
  drillingManHrs: number;
  machiningManHrs: number;
  finalInspectionManHrs: number;
  warehouseManHrs: number;
  transportManHrs: number;
  transportKm: number;
  transportFuelCost: number;
  siteInstallationManHrs: number;
  invoiceManHrs: number;
  totalKm: number;
  totalManHrsCost: number;
  totalFuelCost: number;
  totalCost: number;
  invoiceCost: number;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costing: CostingService,
  ) {}

  /** Man-hour + fuel cost for one line (same rules as project status report). */
  private computeLineCostParts(
    line: {
      manHours: ManHourEntry[];
      travelRows: TravelEntry[];
      invoiceAmountSar: Parameters<typeof num>[0];
    },
    hourly: number,
    fuelKm: number,
  ) {
    const mh = line.manHours;
    const tr = line.travelRows;
    const yardKm = this.costing.sumTravelKm(tr, [WorkflowStage.FABRICATION_SHOP]);
    const transportK = this.costing.sumTravelKm(tr, [WorkflowStage.TRANSPORT]);
    const totalKm = yardKm + transportK;
    const fuelYard = yardKm * fuelKm;
    const fuelTrans = transportK * fuelKm;
    const totalFuel = fuelYard + fuelTrans;
    const totalHrs = mh.reduce((s, e) => s + manHourQuantity(e), 0);
    const manCost = totalHrs * hourly;
    const totalCost = manCost + totalFuel;
    return {
      manCost,
      totalFuel,
      totalCost,
      invoiceCost: num(line.invoiceAmountSar),
    };
  }

  /** Aggregate cost across all active projects (admin) or lines in user stages. */
  async portfolioCostSummary(roleSlugs: string[]) {
    const hourly = await this.costing.getDefaultHourlyRate();
    const fuelKm = await this.costing.getDefaultFuelPerKm();

    const base = { project: { status: ProjectStatus.ACTIVE } };
    const where = isAdmin(roleSlugs)
      ? base
      : {
          currentStage: { in: stagesForRoles(roleSlugs) },
          ...base,
        };

    const lines = await this.prisma.lineItem.findMany({
      where,
      include: {
        manHours: true,
        travelRows: true,
        project: {
          select: { id: true, projectId: true, projectName: true, client: true },
        },
      },
    });

    let totalManHrsCost = 0;
    let totalFuelCost = 0;
    let totalCost = 0;
    let totalInvoice = 0;
    const byProject = new Map<
      string,
      {
        label: string;
        client: string | null;
        manCost: number;
        fuelCost: number;
        totalCost: number;
        invoice: number;
      }
    >();

    for (const line of lines) {
      const p = this.computeLineCostParts(line, hourly, fuelKm);
      totalManHrsCost += p.manCost;
      totalFuelCost += p.totalFuel;
      totalCost += p.totalCost;
      totalInvoice += p.invoiceCost;

      const key = line.projectId;
      const label =
        line.project.projectName || line.project.projectId || key;
      const cur = byProject.get(key) ?? {
        label,
        client: line.project.client,
        manCost: 0,
        fuelCost: 0,
        totalCost: 0,
        invoice: 0,
      };
      cur.manCost += p.manCost;
      cur.fuelCost += p.totalFuel;
      cur.totalCost += p.totalCost;
      cur.invoice += p.invoiceCost;
      byProject.set(key, cur);
    }

    const byProjectArr = [...byProject.entries()]
      .map(([projectId, v]) => ({ projectId, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 24);

    return {
      scope: isAdmin(roleSlugs) ? ('all' as const) : ('mine' as const),
      lineCount: lines.length,
      totalManHrsCost,
      totalFuelCost,
      totalCost,
      totalInvoice,
      byProject: byProjectArr,
    };
  }

  async getProjectStatus(projectId: string): Promise<StatusReportRow[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        lineItems: {
          include: { manHours: true, travelRows: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const hourly = await this.costing.getDefaultHourlyRate();
    const fuelKm = await this.costing.getDefaultFuelPerKm();

    return project.lineItems.map((line) => {
      const mh = line.manHours;
      const tr = line.travelRows;

      const inputSite = this.costing.sumHoursForStages(mh, [
        WorkflowStage.INPUT_SITE_MEASUREMENT,
      ]);
      const designing = this.costing.sumHoursForStages(mh, [
        WorkflowStage.DESIGNING_ENGINEERING,
        WorkflowStage.COORDINATION,
      ]);
      const yardHrs = this.costing.sumYardShopTransportManHrs(mh);
      const yardKm = this.costing.sumTravelKm(tr, [
        WorkflowStage.FABRICATION_SHOP,
      ]);

      const cutting = this.costing.sumFabByKeywords(mh, ['cutting', 'material']);
      const grinding = this.costing.sumFabByKeywords(mh, ['grind']);
      const fitup = this.costing.sumFabByKeywords(mh, ['fitup', 'fit up']);
      const fitupWeld = this.costing.sumFabByKeywords(mh, ['fitup weld', 'fit up weld']);
      const fitInsp = this.costing.sumFabByKeywords(mh, ['inspection', 'fit up inspection']);
      const welding = this.costing.sumFabByKeywords(mh, ['welding']);
      const finalGrind = this.costing.sumFabByKeywords(mh, ['final grind']);

      const shaping = this.costing.sumMachiningByKeywords(mh, 'shap');
      const drilling = this.costing.sumMachiningByKeywords(mh, 'drill');
      const machining = this.costing.sumMachiningByKeywords(mh, 'machin');
      const finalInsp = this.costing.sumMachiningByKeywords(mh, 'final');

      const warehouse = this.costing.sumHoursForStages(mh, [
        WorkflowStage.WAREHOUSE_STORE,
      ]);
      const transportH = this.costing.sumHoursForStages(mh, [
        WorkflowStage.TRANSPORT,
      ]);
      const transportK = this.costing.sumTravelKm(tr, [WorkflowStage.TRANSPORT]);
      const siteInst = this.costing.sumHoursForStages(mh, [
        WorkflowStage.SITE_INSTALLATION,
      ]);
      const invoiceH = this.costing.sumHoursForStages(mh, [WorkflowStage.INVOICE]);

      const totalKm = yardKm + transportK;
      const fuelYard = yardKm * fuelKm;
      const fuelTrans = transportK * fuelKm;
      const totalFuel = fuelYard + fuelTrans;

      const totalHrs = mh.reduce((s, e) => s + manHourQuantity(e), 0);

      const manCost = totalHrs * hourly;
      const totalCost = manCost + totalFuel;
      const invCost = num(line.invoiceAmountSar);

      return {
        year: project.year,
        month: project.month,
        area: project.area,
        client: project.client,
        plant: project.plant,
        poNumber: project.poNumber,
        projectId: project.projectId,
        bidNumber: project.bidNumber,
        inputDrawingNumber: line.inputDrawingNumber,
        drawingNumber: line.drawingNumber,
        sheetNo: line.sheetNo,
        revNo: line.revNo,
        material: line.material,
        clampType: line.clampType,
        description: line.description,
        qty: line.qty != null ? num(line.qty) : null,
        unitWeight: line.unitWeight != null ? num(line.unitWeight) : null,
        totalWeight: line.totalWeight != null ? num(line.totalWeight) : null,
        measurementDate: line.measurementDate?.toISOString().slice(0, 10) ?? null,
        targetDate: line.targetDate?.toISOString().slice(0, 10) ?? null,
        inputSiteMeasurementManHrs: inputSite,
        designingEngineeringManHrs: designing,
        yardToShopTransportHrs: yardHrs,
        yardToShopKm: yardKm,
        yardToShopFuelCost: fuelYard,
        materialCuttingManHrs: cutting,
        grindingManHrs: grinding,
        fitupManHrs: fitup,
        fitupWeldingManHrs: fitupWeld,
        fitupInspectionManHrs: fitInsp,
        weldingManHrs: welding,
        finalGrindingManHrs: finalGrind,
        shapingManHrs: shaping,
        drillingManHrs: drilling,
        machiningManHrs: machining,
        finalInspectionManHrs: finalInsp,
        warehouseManHrs: warehouse,
        transportManHrs: transportH,
        transportKm: transportK,
        transportFuelCost: fuelTrans,
        siteInstallationManHrs: siteInst,
        invoiceManHrs: invoiceH,
        totalKm,
        totalManHrsCost: manCost,
        totalFuelCost: totalFuel,
        totalCost,
        invoiceCost: invCost,
      };
    });
  }

  /** Cost summary = same numbers, fewer columns emphasising stage hours */
  async getCostSummary(projectId: string) {
    const rows = await this.getProjectStatus(projectId);
    return rows.map((r) => ({
      year: r.year,
      month: r.month,
      area: r.area,
      client: r.client,
      plant: r.plant,
      poNumber: r.poNumber,
      projectId: r.projectId,
      bidNumber: r.bidNumber,
      inputDrawingNumber: r.inputDrawingNumber,
      drawingNumber: r.drawingNumber,
      sheetNo: r.sheetNo,
      revNo: r.revNo,
      material: r.material,
      clampType: r.clampType,
      description: r.description,
      qty: r.qty,
      unitWeight: r.unitWeight,
      totalWeight: r.totalWeight,
      measurementDate: r.measurementDate,
      targetDate: r.targetDate,
      inputSiteMeasurementManHrs: r.inputSiteMeasurementManHrs,
      designingEngineeringManHrs: r.designingEngineeringManHrs,
      yardToShopTransportManHrs: r.yardToShopTransportHrs,
      materialCuttingManHrs: r.materialCuttingManHrs,
      grindingManHrs: r.grindingManHrs,
      fitupManHrs: r.fitupManHrs,
      fitupWeldingManHrs: r.fitupWeldingManHrs,
      fitupInspectionManHrs: r.fitupInspectionManHrs,
      weldingManHrs: r.weldingManHrs,
      finalGrindingManHrs: r.finalGrindingManHrs,
      shapingManHrs: r.shapingManHrs,
      drillingManHrs: r.drillingManHrs,
      machiningManHrs: r.machiningManHrs,
      finalInspectionManHrs: r.finalInspectionManHrs,
      warehouseManHrs: r.warehouseManHrs,
      transportManHrs: r.transportManHrs,
      siteInstallationManHrs: r.siteInstallationManHrs,
      invoiceManHrs: r.invoiceManHrs,
    }));
  }

  toCsv(headers: string[], rows: Record<string, unknown>[]): string {
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => esc(row[h])).join(',')),
    ];
    return '\uFEFF' + lines.join('\n');
  }

  /** Simple PDF table (first 14 columns + row preview) */
  async generateProjectStatusPdf(projectId: string): Promise<Buffer> {
    const rows = await this.getProjectStatus(projectId);
    /** PDF built-in fonts only support WinAnsi; strip unsupported glyphs to avoid blank/crash. */
    const pdfCell = (v: unknown, maxLen: number): string => {
      if (v == null) return '';
      const s =
        typeof v === 'number' && !Number.isNaN(Number(v))
          ? Number(v).toFixed(2)
          : String(v).replace(/\r?\n/g, ' ');
      return Array.from(s)
        .map((ch) => {
          const c = ch.charCodeAt(0);
          return c >= 0x20 && c <= 0xff ? ch : '?';
        })
        .join('')
        .slice(0, maxLen);
    };

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 32,
        size: 'A4',
        layout: 'landscape',
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        doc.fontSize(14).text('Project status report', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#444').text(`projectId=${pdfCell(projectId, 80)}`);
        doc.moveDown(1);

        if (!rows.length) {
          doc.fillColor('#000').fontSize(11).text('No line items for this project.');
          doc.end();
          return;
        }

        const cols = Object.keys(rows[0]).slice(0, 14);
        const colW = 52;
        let y = doc.y;
        const x0 = doc.x;
        doc.fontSize(7).fillColor('#000');
        cols.forEach((h, i) => {
          const label = pdfCell(h.replace(/([A-Z])/g, ' $1').trim(), 22);
          doc.text(label, x0 + i * colW, y, {
            width: colW - 4,
          });
        });
        y += 16;

        rows.slice(0, 25).forEach((row) => {
          cols.forEach((k, i) => {
            const raw = (row as Record<string, unknown>)[k];
            doc.text(pdfCell(raw, 24), x0 + i * colW, y, { width: colW - 4 });
          });
          y += 12;
          if (y > doc.page.height - 60) {
            doc.addPage();
            y = 40;
          }
        });

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}

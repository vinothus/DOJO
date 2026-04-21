"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const role_workflow_1 = require("../common/role-workflow");
const costing_service_1 = require("../costing/costing.service");
const prisma_service_1 = require("../prisma/prisma.service");
const PDFDocument = require("pdfkit");
let ReportsService = class ReportsService {
    constructor(prisma, costing) {
        this.prisma = prisma;
        this.costing = costing;
    }
    computeLineCostParts(line, hourly, fuelKm) {
        const mh = line.manHours;
        const tr = line.travelRows;
        const yardKm = this.costing.sumTravelKm(tr, [client_1.WorkflowStage.FABRICATION_SHOP]);
        const transportK = this.costing.sumTravelKm(tr, [client_1.WorkflowStage.TRANSPORT]);
        const totalKm = yardKm + transportK;
        const fuelYard = yardKm * fuelKm;
        const fuelTrans = transportK * fuelKm;
        const totalFuel = fuelYard + fuelTrans;
        const totalHrs = mh.reduce((s, e) => s + (0, costing_service_1.manHourQuantity)(e), 0);
        const manCost = totalHrs * hourly;
        const totalCost = manCost + totalFuel;
        return {
            manCost,
            totalFuel,
            totalCost,
            invoiceCost: (0, costing_service_1.num)(line.invoiceAmountSar),
        };
    }
    async portfolioCostSummary(roleSlugs) {
        const hourly = await this.costing.getDefaultHourlyRate();
        const fuelKm = await this.costing.getDefaultFuelPerKm();
        const base = { project: { status: client_1.ProjectStatus.ACTIVE } };
        const where = (0, role_workflow_1.isAdmin)(roleSlugs)
            ? base
            : {
                currentStage: { in: (0, role_workflow_1.stagesForRoles)(roleSlugs) },
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
        const byProject = new Map();
        for (const line of lines) {
            const p = this.computeLineCostParts(line, hourly, fuelKm);
            totalManHrsCost += p.manCost;
            totalFuelCost += p.totalFuel;
            totalCost += p.totalCost;
            totalInvoice += p.invoiceCost;
            const key = line.projectId;
            const label = line.project.projectName || line.project.projectId || key;
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
            scope: (0, role_workflow_1.isAdmin)(roleSlugs) ? 'all' : 'mine',
            lineCount: lines.length,
            totalManHrsCost,
            totalFuelCost,
            totalCost,
            totalInvoice,
            byProject: byProjectArr,
        };
    }
    async getProjectStatus(projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                lineItems: {
                    include: { manHours: true, travelRows: true },
                },
            },
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const hourly = await this.costing.getDefaultHourlyRate();
        const fuelKm = await this.costing.getDefaultFuelPerKm();
        return project.lineItems.map((line) => {
            const mh = line.manHours;
            const tr = line.travelRows;
            const inputSite = this.costing.sumHoursForStages(mh, [
                client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
            ]);
            const designing = this.costing.sumHoursForStages(mh, [
                client_1.WorkflowStage.DESIGNING_ENGINEERING,
                client_1.WorkflowStage.COORDINATION,
            ]);
            const yardHrs = this.costing.sumYardShopTransportManHrs(mh);
            const yardKm = this.costing.sumTravelKm(tr, [
                client_1.WorkflowStage.FABRICATION_SHOP,
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
                client_1.WorkflowStage.WAREHOUSE_STORE,
            ]);
            const transportH = this.costing.sumHoursForStages(mh, [
                client_1.WorkflowStage.TRANSPORT,
            ]);
            const transportK = this.costing.sumTravelKm(tr, [client_1.WorkflowStage.TRANSPORT]);
            const siteInst = this.costing.sumHoursForStages(mh, [
                client_1.WorkflowStage.SITE_INSTALLATION,
            ]);
            const invoiceH = this.costing.sumHoursForStages(mh, [client_1.WorkflowStage.INVOICE]);
            const totalKm = yardKm + transportK;
            const fuelYard = yardKm * fuelKm;
            const fuelTrans = transportK * fuelKm;
            const totalFuel = fuelYard + fuelTrans;
            const totalHrs = mh.reduce((s, e) => s + (0, costing_service_1.manHourQuantity)(e), 0);
            const manCost = totalHrs * hourly;
            const totalCost = manCost + totalFuel;
            const invCost = (0, costing_service_1.num)(line.invoiceAmountSar);
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
                qty: line.qty != null ? (0, costing_service_1.num)(line.qty) : null,
                unitWeight: line.unitWeight != null ? (0, costing_service_1.num)(line.unitWeight) : null,
                totalWeight: line.totalWeight != null ? (0, costing_service_1.num)(line.totalWeight) : null,
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
    async getCostSummary(projectId) {
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
    toCsv(headers, rows) {
        const esc = (v) => {
            const s = v == null ? '' : String(v);
            if (/[",\n]/.test(s))
                return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const lines = [
            headers.join(','),
            ...rows.map((row) => headers.map((h) => esc(row[h])).join(',')),
        ];
        return '\uFEFF' + lines.join('\n');
    }
    async generateProjectStatusPdf(projectId) {
        const rows = await this.getProjectStatus(projectId);
        const pdfCell = (v, maxLen) => {
            if (v == null)
                return '';
            const s = typeof v === 'number' && !Number.isNaN(Number(v))
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
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
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
                        const raw = row[k];
                        doc.text(pdfCell(raw, 24), x0 + i * colW, y, { width: colW - 4 });
                    });
                    y += 12;
                    if (y > doc.page.height - 60) {
                        doc.addPage();
                        y = 40;
                    }
                });
                doc.end();
            }
            catch (e) {
                reject(e);
            }
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        costing_service_1.CostingService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map
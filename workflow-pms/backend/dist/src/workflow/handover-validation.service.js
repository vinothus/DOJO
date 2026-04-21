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
exports.HandoverValidationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const workspace_settings_service_1 = require("../settings/workspace-settings.service");
const workspace_settings_types_1 = require("../settings/workspace-settings.types");
const workflow_constants_1 = require("./workflow.constants");
function transitionRuleToStagePatch(t) {
    if (!t)
        return {};
    const { projectHeaderRequired: _ph, requireCoordinationFields: _cf, requireSiteMeasurementLineFields: _sm, ...rest } = t;
    return rest;
}
let HandoverValidationService = class HandoverValidationService {
    constructor(prisma, workspaceSettings) {
        this.prisma = prisma;
        this.workspaceSettings = workspaceSettings;
    }
    async getHandoverGate(lineItemId) {
        const settings = await this.workspaceSettings.get();
        const line = await this.prisma.lineItem.findUnique({
            where: { id: lineItemId },
            include: {
                project: true,
                manHours: true,
                travelRows: true,
                bomLines: true,
                attachments: true,
            },
        });
        if (!line)
            return { ready: false, nextStage: null, errors: ['Line item not found'] };
        const nextStage = (0, workflow_constants_1.getNextStage)(line.currentStage);
        if (!nextStage) {
            return {
                ready: false,
                nextStage: null,
                errors: ['Line is at Invoice — no further handover.'],
                currentStage: line.currentStage,
            };
        }
        const errors = [];
        this.validateExitFromStage(line, line.currentStage, nextStage, errors, settings);
        return {
            ready: errors.length === 0,
            nextStage,
            errors,
            currentStage: line.currentStage,
        };
    }
    async validateExitFromCurrentStage(line) {
        const settings = await this.workspaceSettings.get();
        const errors = [];
        const next = (0, workflow_constants_1.getNextStage)(line.currentStage);
        if (!next) {
            return { ok: false, errors: ['No further handover — line is at Invoice.'] };
        }
        this.validateExitFromStage(line, line.currentStage, next, errors, settings);
        return { ok: errors.length === 0, errors };
    }
    resolveHandoverContext(fromStage, nextStage, settings) {
        const key = `${fromStage}__${nextStage}`;
        const t = settings.handoverTransitions?.[key];
        const rule = {
            ...(workspace_settings_types_1.DEFAULT_WORKSPACE.stageHandover[fromStage] ?? {}),
            ...(settings.stageHandover[fromStage] ?? {}),
            ...transitionRuleToStagePatch(t),
        };
        let projectHeader = {
            ...settings.projectHeaderHandover,
        };
        if (t?.projectHeaderRequired) {
            projectHeader = { ...projectHeader, ...t.projectHeaderRequired };
        }
        const requireCoordinationFields = fromStage === client_1.WorkflowStage.COORDINATION
            ? t?.requireCoordinationFields !== false
            : true;
        const requireSiteMeasurementLineFields = fromStage === client_1.WorkflowStage.INPUT_SITE_MEASUREMENT
            ? t?.requireSiteMeasurementLineFields !== false
            : true;
        return {
            rule,
            projectHeader,
            requireCoordinationFields,
            requireSiteMeasurementLineFields,
        };
    }
    validateExitFromStage(line, fromStage, nextStage, errors, settings) {
        const ctx = this.resolveHandoverContext(fromStage, nextStage, settings);
        this.requireProjectHeader(line.project, errors, ctx.projectHeader);
        const rule = ctx.rule;
        switch (fromStage) {
            case client_1.WorkflowStage.INPUT_SITE_MEASUREMENT:
                if (ctx.requireSiteMeasurementLineFields) {
                    this.requireSiteMeasurementHeader(line, errors);
                }
                if (rule.requireManHours !== false) {
                    this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.INPUT_SITE_MEASUREMENT, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                }
                if (rule.requireTravel !== false) {
                    this.requireTravelForStage(line.travelRows, client_1.WorkflowStage.INPUT_SITE_MEASUREMENT, errors);
                }
                this.requireMinAttachments(line.attachments, client_1.WorkflowStage.INPUT_SITE_MEASUREMENT, rule.minAttachments ?? 1, errors, 'Site measurement');
                break;
            case client_1.WorkflowStage.DESIGNING_ENGINEERING:
                this.requireSiteMeasurementHeader(line, errors);
                if (rule.requireEngineeringWeights !== false) {
                    if (!this.positiveQty(line.unitWeight))
                        errors.push('Line — Engineering: Unit weight is required');
                    if (!this.positiveQty(line.totalWeight))
                        errors.push('Line — Engineering: Total weight is required');
                }
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.DESIGNING_ENGINEERING, errors, { needJobStatus: true, needWorkDate: true, needHours: true, needApprovalStatus: true });
                if (rule.requireBom !== false) {
                    this.requireBillOfMaterials(line.bomLines, errors);
                }
                break;
            case client_1.WorkflowStage.COORDINATION:
                if (ctx.requireCoordinationFields) {
                    this.requireCoordinationFields(line, errors);
                }
                if (rule.requireManHours) {
                    this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.COORDINATION, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                }
                break;
            case client_1.WorkflowStage.FABRICATION_SHOP:
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.FABRICATION_SHOP, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                if (rule.requireTravel !== false) {
                    this.requireTravelForStage(line.travelRows, client_1.WorkflowStage.FABRICATION_SHOP, errors);
                }
                break;
            case client_1.WorkflowStage.MACHINING_SHOP:
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.MACHINING_SHOP, errors, { needJobStatus: true, needWorkDate: true, needHours: true, needJobDescription: true });
                this.requireMinAttachments(line.attachments, client_1.WorkflowStage.MACHINING_SHOP, rule.minAttachments ?? 1, errors, 'Machining shop');
                break;
            case client_1.WorkflowStage.WAREHOUSE_STORE:
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.WAREHOUSE_STORE, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                break;
            case client_1.WorkflowStage.TRANSPORT:
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.TRANSPORT, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                if (rule.requireTravel !== false) {
                    this.requireTravelForStage(line.travelRows, client_1.WorkflowStage.TRANSPORT, errors);
                }
                break;
            case client_1.WorkflowStage.SITE_INSTALLATION:
                this.requireManHoursForStage(line.manHours, client_1.WorkflowStage.SITE_INSTALLATION, errors, { needJobStatus: true, needWorkDate: true, needHours: true });
                this.requireMinAttachments(line.attachments, client_1.WorkflowStage.SITE_INSTALLATION, rule.minAttachments ?? 1, errors, 'Site installation');
                break;
            case client_1.WorkflowStage.INVOICE:
                break;
        }
    }
    requireProjectHeader(p, errors, req) {
        if (req.year && p.year == null)
            errors.push('Project: Year is required');
        if (req.month && p.month == null)
            errors.push('Project: Month is required');
        if (req.area && !this.nonEmpty(p.area))
            errors.push('Project: Area is required');
        if (req.client && !this.nonEmpty(p.client))
            errors.push('Project: Client is required');
        if (req.plant && !this.nonEmpty(p.plant))
            errors.push('Project: Plant/Unit is required');
        if (req.poNumber && !this.nonEmpty(p.poNumber))
            errors.push('Project: PO number is required');
        if (req.projectId && !this.nonEmpty(p.projectId))
            errors.push('Project: Project ID is required');
        if (req.bidNumber && !this.nonEmpty(p.bidNumber))
            errors.push('Project: Bid number is required');
    }
    requireCoordinationFields(line, errors) {
        if (!line.coordDesignRequestedAt) {
            errors.push('Co-ordinator: Design requested date is required');
        }
        if (!line.coordEngineeringSubmittedAt) {
            errors.push('Co-ordinator: Engineering submitted date is required');
        }
        if (!this.nonEmpty(line.coordApprovalStatus)) {
            errors.push('Co-ordinator: Approval status is required');
        }
        if (!this.nonEmpty(line.coordDescription)) {
            errors.push('Co-ordinator: Description is required');
        }
    }
    requireSiteMeasurementHeader(line, errors) {
        if (!this.nonEmpty(line.inputDrawingNumber))
            errors.push('Line — Site measurement: Input drawing number is required');
        if (!this.nonEmpty(line.drawingNumber))
            errors.push('Line — Site measurement: Drawing number is required');
        if (!this.nonEmpty(line.sheetNo))
            errors.push('Line — Site measurement: Sheet No is required');
        if (!this.nonEmpty(line.revNo))
            errors.push('Line — Site measurement: Rev No is required');
        if (!this.nonEmpty(line.clampType))
            errors.push('Line — Site measurement: Clamp type is required');
        if (!this.nonEmpty(line.material))
            errors.push('Line — Site measurement: Material is required');
        if (!this.nonEmpty(line.description))
            errors.push('Line — Site measurement: Description is required');
        if (!this.positiveQty(line.qty))
            errors.push('Line — Site measurement: Quantity is required');
        if (!line.measurementDate)
            errors.push('Line — Site measurement: Measurement date is required');
        if (!line.targetDate)
            errors.push('Line — Site measurement: Target date is required');
    }
    requireBillOfMaterials(bomLines, errors) {
        const ok = bomLines.some((b) => this.nonEmpty(b.description) &&
            this.positiveQty(b.qty) &&
            this.nonEmpty(b.materialSpec));
        if (!ok) {
            errors.push('Bill of materials: Add at least one row with Description, Qty, and Material spec');
        }
    }
    requireMinAttachments(attachments, stage, min, errors, label) {
        const n = attachments.filter((a) => a.stage === stage).length;
        if (n < min) {
            errors.push(`${label}: At least ${min} attachment(s) for this stage is required before handover`);
        }
    }
    requireManHoursForStage(rows, stage, errors, flags) {
        const subset = rows.filter((r) => r.stage === stage);
        const label = `Man-hours (${stage.replace(/_/g, ' ')})`;
        if (!subset.length) {
            errors.push(`${label}: Add at least one row`);
            return;
        }
        const valid = subset.some((r) => {
            if (flags.needHours && !this.hasManHourQuantity(r))
                return false;
            if (flags.needWorkDate && !r.workDate)
                return false;
            if (flags.needJobStatus && !this.nonEmpty(r.jobStatus))
                return false;
            if (flags.needApprovalStatus && !this.nonEmpty(r.approvalStatus))
                return false;
            if (flags.needJobDescription && !this.nonEmpty(r.jobDescription))
                return false;
            return true;
        });
        if (!valid) {
            const parts = ['hours'];
            if (flags.needWorkDate)
                parts.push('date');
            if (flags.needJobStatus)
                parts.push('job status');
            if (flags.needApprovalStatus)
                parts.push('approval status');
            if (flags.needJobDescription)
                parts.push('job description');
            errors.push(`${label}: At least one row must include ${parts.join(', ')}`);
        }
    }
    requireTravelForStage(rows, stage, errors) {
        const subset = rows.filter((r) => r.stage === stage);
        const label = `Travel (${stage.replace(/_/g, ' ')})`;
        if (!subset.length) {
            errors.push(`${label}: Add at least one trip row`);
            return;
        }
        const valid = subset.some((r) => {
            if (!this.nonEmpty(r.vehicleType))
                return false;
            if (!r.workDate)
                return false;
            const ow = r.oneWayKm != null ? Number(r.oneWayKm) : 0;
            const rt = r.roundTripKm != null ? Number(r.roundTripKm) : 0;
            const th = r.travelHours != null ? Number(r.travelHours) : 0;
            if (ow <= 0 && rt <= 0 && th <= 0)
                return false;
            return true;
        });
        if (!valid) {
            errors.push(`${label}: At least one row needs date, vehicle type, and distance (km) and/or travel hours`);
        }
    }
    hasManHourQuantity(r) {
        const t = r.totalHours != null ? Number(r.totalHours) : 0;
        const n = r.normalHours != null ? Number(r.normalHours) : 0;
        const o = r.otHours != null ? Number(r.otHours) : 0;
        return t > 0 || n > 0 || o > 0;
    }
    nonEmpty(s) {
        return !!(s && String(s).trim());
    }
    positiveQty(q) {
        if (q === null || q === undefined)
            return false;
        const n = Number(q);
        return !Number.isNaN(n) && n > 0;
    }
};
exports.HandoverValidationService = HandoverValidationService;
exports.HandoverValidationService = HandoverValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workspace_settings_service_1.WorkspaceSettingsService])
], HandoverValidationService);
//# sourceMappingURL=handover-validation.service.js.map
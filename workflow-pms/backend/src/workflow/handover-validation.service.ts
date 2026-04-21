import { Injectable } from '@nestjs/common';
import {
  Attachment,
  BomLine,
  LineItem,
  ManHourEntry,
  Project,
  TravelEntry,
  WorkflowStage,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceSettingsService } from '../settings/workspace-settings.service';
import type {
  HandoverTransitionRule,
  ProjectHeaderFieldKey,
  StageHandoverRule,
  WorkspaceSettingsV1,
} from '../settings/workspace-settings.types';
import { DEFAULT_WORKSPACE } from '../settings/workspace-settings.types';
import { getNextStage } from './workflow.constants';

function transitionRuleToStagePatch(
  t: HandoverTransitionRule | undefined,
): Partial<StageHandoverRule> {
  if (!t) return {};
  const {
    projectHeaderRequired: _ph,
    requireCoordinationFields: _cf,
    requireSiteMeasurementLineFields: _sm,
    ...rest
  } = t;
  return rest;
}

/**
 * Mandatory data before advancing from `currentStage` to the next stage.
 * Rules are driven by SystemSettings workspace JSON (merged with defaults).
 */
@Injectable()
export class HandoverValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceSettings: WorkspaceSettingsService,
  ) {}

  async getHandoverGate(lineItemId: string) {
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
    if (!line) return { ready: false, nextStage: null as WorkflowStage | null, errors: ['Line item not found'] };

    const nextStage = getNextStage(line.currentStage);
    if (!nextStage) {
      return {
        ready: false,
        nextStage: null,
        errors: ['Line is at Invoice — no further handover.'],
        currentStage: line.currentStage,
      };
    }

    const errors: string[] = [];
    this.validateExitFromStage(line, line.currentStage, nextStage, errors, settings);
    return {
      ready: errors.length === 0,
      nextStage,
      errors,
      currentStage: line.currentStage,
    };
  }

  async validateExitFromCurrentStage(
    line: LineItem & {
      project: Project;
      manHours: ManHourEntry[];
      travelRows: TravelEntry[];
      bomLines: BomLine[];
      attachments: Attachment[];
    },
  ): Promise<{ ok: boolean; errors: string[] }> {
    const settings = await this.workspaceSettings.get();
    const errors: string[] = [];
    const next = getNextStage(line.currentStage);
    if (!next) {
      return { ok: false, errors: ['No further handover — line is at Invoice.'] };
    }
    this.validateExitFromStage(line, line.currentStage, next, errors, settings);
    return { ok: errors.length === 0, errors };
  }

  private resolveHandoverContext(
    fromStage: WorkflowStage,
    nextStage: WorkflowStage,
    settings: WorkspaceSettingsV1,
  ): {
    rule: StageHandoverRule;
    projectHeader: Record<ProjectHeaderFieldKey, boolean>;
    requireCoordinationFields: boolean;
    requireSiteMeasurementLineFields: boolean;
  } {
    const key = `${fromStage}__${nextStage}`;
    const t = settings.handoverTransitions?.[key];
    const rule: StageHandoverRule = {
      ...(DEFAULT_WORKSPACE.stageHandover[fromStage] ?? {}),
      ...(settings.stageHandover[fromStage] ?? {}),
      ...transitionRuleToStagePatch(t),
    };
    let projectHeader: Record<ProjectHeaderFieldKey, boolean> = {
      ...settings.projectHeaderHandover,
    };
    if (t?.projectHeaderRequired) {
      projectHeader = { ...projectHeader, ...t.projectHeaderRequired };
    }
    const requireCoordinationFields =
      fromStage === WorkflowStage.COORDINATION
        ? t?.requireCoordinationFields !== false
        : true;
    const requireSiteMeasurementLineFields =
      fromStage === WorkflowStage.INPUT_SITE_MEASUREMENT
        ? t?.requireSiteMeasurementLineFields !== false
        : true;
    return {
      rule,
      projectHeader,
      requireCoordinationFields,
      requireSiteMeasurementLineFields,
    };
  }

  private validateExitFromStage(
    line: LineItem & {
      project: Project;
      manHours: ManHourEntry[];
      travelRows: TravelEntry[];
      bomLines: BomLine[];
      attachments: Attachment[];
    },
    fromStage: WorkflowStage,
    nextStage: WorkflowStage,
    errors: string[],
    settings: WorkspaceSettingsV1,
  ) {
    const ctx = this.resolveHandoverContext(fromStage, nextStage, settings);
    this.requireProjectHeader(line.project, errors, ctx.projectHeader);

    const rule = ctx.rule;

    switch (fromStage) {
      case WorkflowStage.INPUT_SITE_MEASUREMENT:
        if (ctx.requireSiteMeasurementLineFields) {
          this.requireSiteMeasurementHeader(line, errors);
        }
        if (rule.requireManHours !== false) {
          this.requireManHoursForStage(
            line.manHours,
            WorkflowStage.INPUT_SITE_MEASUREMENT,
            errors,
            { needJobStatus: true, needWorkDate: true, needHours: true },
          );
        }
        if (rule.requireTravel !== false) {
          this.requireTravelForStage(
            line.travelRows,
            WorkflowStage.INPUT_SITE_MEASUREMENT,
            errors,
          );
        }
        this.requireMinAttachments(
          line.attachments,
          WorkflowStage.INPUT_SITE_MEASUREMENT,
          rule.minAttachments ?? 1,
          errors,
          'Site measurement',
        );
        break;

      case WorkflowStage.DESIGNING_ENGINEERING:
        this.requireSiteMeasurementHeader(line, errors);
        if (rule.requireEngineeringWeights !== false) {
          if (!this.positiveQty(line.unitWeight))
            errors.push('Line — Engineering: Unit weight is required');
          if (!this.positiveQty(line.totalWeight))
            errors.push('Line — Engineering: Total weight is required');
        }
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.DESIGNING_ENGINEERING,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true, needApprovalStatus: true },
        );
        if (rule.requireBom !== false) {
          this.requireBillOfMaterials(line.bomLines, errors);
        }
        break;

      case WorkflowStage.COORDINATION:
        if (ctx.requireCoordinationFields) {
          this.requireCoordinationFields(line, errors);
        }
        if (rule.requireManHours) {
          this.requireManHoursForStage(
            line.manHours,
            WorkflowStage.COORDINATION,
            errors,
            { needJobStatus: true, needWorkDate: true, needHours: true },
          );
        }
        break;

      case WorkflowStage.FABRICATION_SHOP:
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.FABRICATION_SHOP,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true },
        );
        if (rule.requireTravel !== false) {
          this.requireTravelForStage(
            line.travelRows,
            WorkflowStage.FABRICATION_SHOP,
            errors,
          );
        }
        break;

      case WorkflowStage.MACHINING_SHOP:
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.MACHINING_SHOP,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true, needJobDescription: true },
        );
        this.requireMinAttachments(
          line.attachments,
          WorkflowStage.MACHINING_SHOP,
          rule.minAttachments ?? 1,
          errors,
          'Machining shop',
        );
        break;

      case WorkflowStage.WAREHOUSE_STORE:
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.WAREHOUSE_STORE,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true },
        );
        break;

      case WorkflowStage.TRANSPORT:
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.TRANSPORT,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true },
        );
        if (rule.requireTravel !== false) {
          this.requireTravelForStage(
            line.travelRows,
            WorkflowStage.TRANSPORT,
            errors,
          );
        }
        break;

      case WorkflowStage.SITE_INSTALLATION:
        this.requireManHoursForStage(
          line.manHours,
          WorkflowStage.SITE_INSTALLATION,
          errors,
          { needJobStatus: true, needWorkDate: true, needHours: true },
        );
        this.requireMinAttachments(
          line.attachments,
          WorkflowStage.SITE_INSTALLATION,
          rule.minAttachments ?? 1,
          errors,
          'Site installation',
        );
        break;

      case WorkflowStage.INVOICE:
        break;
    }
  }

  private requireProjectHeader(
    p: Project,
    errors: string[],
    req: Record<ProjectHeaderFieldKey, boolean>,
  ) {
    if (req.year && p.year == null) errors.push('Project: Year is required');
    if (req.month && p.month == null) errors.push('Project: Month is required');
    if (req.area && !this.nonEmpty(p.area)) errors.push('Project: Area is required');
    if (req.client && !this.nonEmpty(p.client)) errors.push('Project: Client is required');
    if (req.plant && !this.nonEmpty(p.plant)) errors.push('Project: Plant/Unit is required');
    if (req.poNumber && !this.nonEmpty(p.poNumber)) errors.push('Project: PO number is required');
    if (req.projectId && !this.nonEmpty(p.projectId)) errors.push('Project: Project ID is required');
    if (req.bidNumber && !this.nonEmpty(p.bidNumber)) errors.push('Project: Bid number is required');
  }

  private requireCoordinationFields(line: LineItem, errors: string[]) {
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

  private requireSiteMeasurementHeader(line: LineItem, errors: string[]) {
    if (!this.nonEmpty(line.inputDrawingNumber))
      errors.push('Line — Site measurement: Input drawing number is required');
    if (!this.nonEmpty(line.drawingNumber))
      errors.push('Line — Site measurement: Drawing number is required');
    if (!this.nonEmpty(line.sheetNo)) errors.push('Line — Site measurement: Sheet No is required');
    if (!this.nonEmpty(line.revNo)) errors.push('Line — Site measurement: Rev No is required');
    if (!this.nonEmpty(line.clampType)) errors.push('Line — Site measurement: Clamp type is required');
    if (!this.nonEmpty(line.material)) errors.push('Line — Site measurement: Material is required');
    if (!this.nonEmpty(line.description)) errors.push('Line — Site measurement: Description is required');
    if (!this.positiveQty(line.qty)) errors.push('Line — Site measurement: Quantity is required');
    if (!line.measurementDate) errors.push('Line — Site measurement: Measurement date is required');
    if (!line.targetDate) errors.push('Line — Site measurement: Target date is required');
  }

  private requireBillOfMaterials(bomLines: BomLine[], errors: string[]) {
    const ok = bomLines.some(
      (b) =>
        this.nonEmpty(b.description) &&
        this.positiveQty(b.qty) &&
        this.nonEmpty(b.materialSpec),
    );
    if (!ok) {
      errors.push(
        'Bill of materials: Add at least one row with Description, Qty, and Material spec',
      );
    }
  }

  private requireMinAttachments(
    attachments: Attachment[],
    stage: WorkflowStage,
    min: number,
    errors: string[],
    label: string,
  ) {
    const n = attachments.filter((a) => a.stage === stage).length;
    if (n < min) {
      errors.push(`${label}: At least ${min} attachment(s) for this stage is required before handover`);
    }
  }

  private requireManHoursForStage(
    rows: ManHourEntry[],
    stage: WorkflowStage,
    errors: string[],
    flags: {
      needJobStatus: boolean;
      needWorkDate: boolean;
      needHours: boolean;
      needApprovalStatus?: boolean;
      needJobDescription?: boolean;
    },
  ) {
    const subset = rows.filter((r) => r.stage === stage);
    const label = `Man-hours (${stage.replace(/_/g, ' ')})`;
    if (!subset.length) {
      errors.push(`${label}: Add at least one row`);
      return;
    }
    const valid = subset.some((r) => {
      if (flags.needHours && !this.hasManHourQuantity(r)) return false;
      if (flags.needWorkDate && !r.workDate) return false;
      if (flags.needJobStatus && !this.nonEmpty(r.jobStatus)) return false;
      if (flags.needApprovalStatus && !this.nonEmpty(r.approvalStatus)) return false;
      if (flags.needJobDescription && !this.nonEmpty(r.jobDescription)) return false;
      return true;
    });
    if (!valid) {
      const parts: string[] = ['hours'];
      if (flags.needWorkDate) parts.push('date');
      if (flags.needJobStatus) parts.push('job status');
      if (flags.needApprovalStatus) parts.push('approval status');
      if (flags.needJobDescription) parts.push('job description');
      errors.push(
        `${label}: At least one row must include ${parts.join(', ')}`,
      );
    }
  }

  private requireTravelForStage(
    rows: TravelEntry[],
    stage: WorkflowStage,
    errors: string[],
  ) {
    const subset = rows.filter((r) => r.stage === stage);
    const label = `Travel (${stage.replace(/_/g, ' ')})`;
    if (!subset.length) {
      errors.push(`${label}: Add at least one trip row`);
      return;
    }
    const valid = subset.some((r) => {
      if (!this.nonEmpty(r.vehicleType)) return false;
      if (!r.workDate) return false;
      const ow = r.oneWayKm != null ? Number(r.oneWayKm) : 0;
      const rt = r.roundTripKm != null ? Number(r.roundTripKm) : 0;
      const th = r.travelHours != null ? Number(r.travelHours) : 0;
      if (ow <= 0 && rt <= 0 && th <= 0) return false;
      return true;
    });
    if (!valid) {
      errors.push(
        `${label}: At least one row needs date, vehicle type, and distance (km) and/or travel hours`,
      );
    }
  }

  private hasManHourQuantity(r: ManHourEntry): boolean {
    const t = r.totalHours != null ? Number(r.totalHours) : 0;
    const n = r.normalHours != null ? Number(r.normalHours) : 0;
    const o = r.otHours != null ? Number(r.otHours) : 0;
    return t > 0 || n > 0 || o > 0;
  }

  private nonEmpty(s: string | null | undefined): boolean {
    return !!(s && String(s).trim());
  }

  private positiveQty(q: unknown): boolean {
    if (q === null || q === undefined) return false;
    const n = Number(q);
    return !Number.isNaN(n) && n > 0;
  }
}

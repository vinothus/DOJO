import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, WorkflowStage, type LineItem } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { HandoverValidationService } from '../workflow/handover-validation.service';
import { getNextStage } from '../workflow/workflow.constants';
import { WorkflowAccessService } from '../workflow/workflow-access.service';

@Injectable()
export class LineItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowAccessService,
    private readonly audit: AuditService,
    private readonly handoverGate: HandoverValidationService,
  ) {}

  listByProject(projectId: string) {
    return this.prisma.lineItem.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(id: string) {
    const li = await this.prisma.lineItem.findUnique({
      where: { id },
      include: {
        project: true,
        manHours: true,
        travelRows: true,
        bomLines: true,
        attachments: {
          select: {
            id: true,
            lineItemId: true,
            stage: true,
            fileName: true,
            mime: true,
            sizeBytes: true,
            uploadedById: true,
            createdAt: true,
          },
        },
      },
    });
    if (!li) throw new NotFoundException('Line item not found');
    return li;
  }

  /** Uploader or admin; legacy rows with no uploader → admin only. */
  private canManageAttachment(
    att: { uploadedById: string | null },
    userId: string,
    roles: string[],
  ): boolean {
    if (roles.includes('admin')) return true;
    if (att.uploadedById == null) return false;
    return att.uploadedById === userId;
  }

  async pipeAttachmentToResponse(
    res: Response,
    lineItemId: string,
    attachmentId: string,
    userId: string,
    roles: string[],
    opts?: { inline?: boolean },
  ): Promise<void> {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, lineItemId },
    });
    if (!att) throw new NotFoundException('Attachment not found');
    if (!this.canManageAttachment(att, userId, roles)) {
      throw new ForbiddenException(
        'Only the user who uploaded this file (or an admin) may view or download it.',
      );
    }
    if (!existsSync(att.filePath)) {
      throw new NotFoundException('File not found on server');
    }
    res.setHeader('Content-Type', att.mime ?? 'application/octet-stream');
    const disp = opts?.inline ? 'inline' : 'attachment';
    res.setHeader(
      'Content-Disposition',
      `${disp}; filename="${encodeURIComponent(att.fileName)}"`,
    );
    const stream = createReadStream(att.filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  }

  async updateAttachment(
    lineItemId: string,
    attachmentId: string,
    userId: string,
    roles: string[],
    dto: {
      stage?: WorkflowStage;
      file?: {
        path: string;
        originalname: string;
        mimetype: string;
        size: number;
      };
    },
  ) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, lineItemId },
    });
    if (!att) throw new NotFoundException('Attachment not found');
    if (!this.canManageAttachment(att, userId, roles)) {
      throw new ForbiddenException(
        'Only the uploader or an admin can change this attachment.',
      );
    }
    const nextStage = dto.stage ?? att.stage;
    if (nextStage !== att.stage) {
      await this.assertEdit(roles, nextStage);
    }

    const oldPath = att.filePath;
    const data: Prisma.AttachmentUpdateInput = { stage: nextStage };

    if (dto.file) {
      data.filePath = dto.file.path;
      data.fileName = dto.file.originalname;
      data.mime = dto.file.mimetype;
      data.sizeBytes = dto.file.size;
      data.uploadedBy = { connect: { id: userId } };
    }

    const updated = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data,
      select: {
        id: true,
        lineItemId: true,
        stage: true,
        fileName: true,
        mime: true,
        sizeBytes: true,
        uploadedById: true,
        createdAt: true,
      },
    });

    if (
      dto.file &&
      oldPath &&
      oldPath !== dto.file.path &&
      existsSync(oldPath)
    ) {
      try {
        await unlink(oldPath);
      } catch {
        /* ignore */
      }
    }

    await this.audit.log(
      'LineItem',
      lineItemId,
      dto.file ? 'ATTACHMENT_REPLACE' : 'ATTACHMENT_META_UPDATE',
      {
        attachmentId,
        stage: updated.stage,
        fileName: updated.fileName,
        replaced: !!dto.file,
      },
      userId,
    );

    return updated;
  }

  async deleteAttachment(
    lineItemId: string,
    attachmentId: string,
    userId: string,
    roles: string[],
  ) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, lineItemId },
    });
    if (!att) throw new NotFoundException('Attachment not found');
    if (!this.canManageAttachment(att, userId, roles)) {
      throw new ForbiddenException(
        'Only the uploader or an admin can delete this attachment.',
      );
    }
    if (existsSync(att.filePath)) {
      try {
        await unlink(att.filePath);
      } catch {
        /* ignore disk errors; still remove DB row */
      }
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    await this.audit.log(
      'LineItem',
      lineItemId,
      'ATTACHMENT_DELETE',
      { attachmentId, fileName: att.fileName },
      userId,
    );
    return { ok: true };
  }

  create(
    projectId: string,
    data: {
      inputDrawingNumber?: string;
      drawingNumber?: string;
      sheetNo?: string;
      revNo?: string;
      clampType?: string;
      material?: string;
      description?: string;
      qty?: number;
      unitWeight?: number;
      totalWeight?: number;
      measurementDate?: Date | null;
      targetDate?: Date | null;
      currentStage: WorkflowStage;
    },
    actorUserId?: string,
  ) {
    return this.prisma.project.findUnique({ where: { id: projectId } }).then(async (p) => {
      if (!p) throw new NotFoundException('Project not found');
      const line = await this.prisma.lineItem.create({
        data: {
          project: { connect: { id: projectId } },
          inputDrawingNumber: data.inputDrawingNumber,
          drawingNumber: data.drawingNumber,
          sheetNo: data.sheetNo,
          revNo: data.revNo,
          clampType: data.clampType,
          material: data.material,
          description: data.description,
          qty: data.qty,
          unitWeight: data.unitWeight,
          totalWeight: data.totalWeight,
          measurementDate: data.measurementDate,
          targetDate: data.targetDate,
          currentStage: data.currentStage,
        },
      });
      if (actorUserId) {
        await this.audit.log(
          'LineItem',
          line.id,
          'LINE_CREATE',
          { projectId, initialStage: data.currentStage },
          actorUserId,
        );
      }
      return line;
    });
  }

  private async assertEdit(
    roles: string[],
    stage: WorkflowStage,
  ): Promise<void> {
    const ok = await this.workflow.canAccessStage(roles, stage, 'edit');
    if (!ok) {
      throw new ForbiddenException(
        'You do not have permission to edit line items in this workflow stage.',
      );
    }
  }

  private async assertOverride(
    roles: string[],
    targetStage: WorkflowStage,
  ): Promise<void> {
    const ok = await this.workflow.canAccessStage(
      roles,
      targetStage,
      'override',
    );
    if (!ok) {
      throw new ForbiddenException(
        'You do not have permission to override the workflow stage (admin or override role required).',
      );
    }
  }

  private static stableStringifyJson(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((v) => LineItemsService.stableStringifyJson(v)).join(',')}]`;
    }
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${LineItemsService.stableStringifyJson(o[k])}`)
      .join(',')}}`;
  }

  /** Values suitable for JSON audit payload (Prisma Decimals and dates as strings) */
  private static auditValue(v: unknown): unknown {
    if (v == null) return v;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof (v as { toString?: () => string }).toString === 'function') {
      const ctor = (v as { constructor?: { name?: string } }).constructor?.name;
      if (ctor === 'Decimal' || ctor === 'Big') return (v as { toString: () => string }).toString();
    }
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      return v;
    }
    return v;
  }

  private lineSaveDiff(
    line: LineItem,
    data: {
      inputDrawingNumber?: string;
      drawingNumber?: string;
      sheetNo?: string;
      revNo?: string;
      clampType?: string;
      material?: string;
      description?: string;
      qty?: number;
      unitWeight?: number;
      totalWeight?: number;
      measurementDate?: Date | null;
      targetDate?: Date | null;
      currentStage?: WorkflowStage;
      invoiceAmountSar?: number;
      technicalDetails?: Record<string, unknown> | null;
      coordDesignRequestedAt?: Date | null;
      coordEngineeringSubmittedAt?: Date | null;
      coordApprovalStatus?: string;
      coordDescription?: string;
      version: number;
    },
  ): { changes: Record<string, { from: unknown; to: unknown }>; changeSummary: string[] } {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const changeSummary: string[] = [];
    const dateStr = (d: Date | null | undefined) =>
      d == null ? null : d.toISOString().slice(0, 10);
    const decStr = (d: { toString: () => string } | null | undefined) =>
      d == null ? null : d.toString();
    const numStr = (n: number | null | undefined) =>
      n == null || (typeof n === 'number' && Number.isNaN(n)) ? null : String(n);
    const strNorm = (s: string | null | undefined) => {
      if (s == null) return null;
      const t = s.trim();
      return t.length ? t : null;
    };

    const setStr = (key: keyof LineItem, incoming: string | null | undefined) => {
      if (incoming === undefined) return;
      const from = strNorm(line[key] as string | null);
      const to = strNorm(incoming);
      if (from === to) return;
      changes[key] = { from, to };
      changeSummary.push(String(key));
    };

    setStr('inputDrawingNumber', data.inputDrawingNumber);
    setStr('drawingNumber', data.drawingNumber);
    setStr('sheetNo', data.sheetNo);
    setStr('revNo', data.revNo);
    setStr('clampType', data.clampType);
    setStr('material', data.material);
    setStr('description', data.description);
    setStr('coordApprovalStatus', data.coordApprovalStatus);
    setStr('coordDescription', data.coordDescription);

    if (data.qty !== undefined) {
      const from = decStr(line.qty);
      const to = numStr(data.qty);
      if (from !== to) {
        changes.qty = { from: LineItemsService.auditValue(line.qty), to: data.qty };
        changeSummary.push('qty');
      }
    }
    if (data.unitWeight !== undefined) {
      const from = decStr(line.unitWeight);
      const to = numStr(data.unitWeight);
      if (from !== to) {
        changes.unitWeight = {
          from: LineItemsService.auditValue(line.unitWeight),
          to: data.unitWeight,
        };
        changeSummary.push('unitWeight');
      }
    }
    if (data.totalWeight !== undefined) {
      const from = decStr(line.totalWeight);
      const to = numStr(data.totalWeight);
      if (from !== to) {
        changes.totalWeight = {
          from: LineItemsService.auditValue(line.totalWeight),
          to: data.totalWeight,
        };
        changeSummary.push('totalWeight');
      }
    }
    if (data.invoiceAmountSar !== undefined) {
      const from = decStr(line.invoiceAmountSar);
      const to = numStr(data.invoiceAmountSar);
      if (from !== to) {
        changes.invoiceAmountSar = {
          from: LineItemsService.auditValue(line.invoiceAmountSar),
          to: data.invoiceAmountSar,
        };
        changeSummary.push('invoiceAmountSar');
      }
    }

    if (data.measurementDate !== undefined) {
      const a = dateStr(line.measurementDate);
      const b = dateStr(data.measurementDate);
      if (a !== b) {
        changes.measurementDate = { from: a, to: b };
        changeSummary.push('measurementDate');
      }
    }
    if (data.targetDate !== undefined) {
      const a = dateStr(line.targetDate);
      const b = dateStr(data.targetDate);
      if (a !== b) {
        changes.targetDate = { from: a, to: b };
        changeSummary.push('targetDate');
      }
    }
    if (data.coordDesignRequestedAt !== undefined) {
      const a = dateStr(line.coordDesignRequestedAt);
      const b = dateStr(data.coordDesignRequestedAt);
      if (a !== b) {
        changes.coordDesignRequestedAt = { from: a, to: b };
        changeSummary.push('coordDesignRequestedAt');
      }
    }
    if (data.coordEngineeringSubmittedAt !== undefined) {
      const a = dateStr(line.coordEngineeringSubmittedAt);
      const b = dateStr(data.coordEngineeringSubmittedAt);
      if (a !== b) {
        changes.coordEngineeringSubmittedAt = { from: a, to: b };
        changeSummary.push('coordEngineeringSubmittedAt');
      }
    }
    if (data.currentStage !== undefined && data.currentStage !== line.currentStage) {
      changes.currentStage = { from: line.currentStage, to: data.currentStage };
      changeSummary.push('currentStage');
    }
    if (data.technicalDetails !== undefined) {
      const a = line.technicalDetails;
      const b = data.technicalDetails;
      if (LineItemsService.stableStringifyJson(a) !== LineItemsService.stableStringifyJson(b)) {
        changes.technicalDetails = {
          from: LineItemsService.auditValue(a),
          to: LineItemsService.auditValue(b),
        };
        changeSummary.push('technicalDetails');
      }
    }

    return { changes, changeSummary };
  }

  async update(
    id: string,
    roles: string[],
    data: {
      inputDrawingNumber?: string;
      drawingNumber?: string;
      sheetNo?: string;
      revNo?: string;
      clampType?: string;
      material?: string;
      description?: string;
      qty?: number;
      unitWeight?: number;
      totalWeight?: number;
      measurementDate?: Date | null;
      targetDate?: Date | null;
      currentStage?: WorkflowStage;
      invoiceAmountSar?: number;
      technicalDetails?: Record<string, unknown> | null;
      coordDesignRequestedAt?: Date | null;
      coordEngineeringSubmittedAt?: Date | null;
      coordApprovalStatus?: string;
      coordDescription?: string;
      version: number;
    },
    actorUserId?: string,
  ) {
    const line = await this.prisma.lineItem.findUnique({ where: { id } });
    if (!line) throw new NotFoundException('Line item not found');
    if (line.version !== data.version) {
      throw new ConflictException({
        message: 'Version conflict — row was updated elsewhere',
        currentVersion: line.version,
      });
    }

    await this.assertEdit(roles, line.currentStage);
    const { version, technicalDetails, ...rest } = data;
    const { changes, changeSummary } = this.lineSaveDiff(line, data);
    const updated = await this.prisma.lineItem.update({
      where: { id },
      data: {
        ...rest,
        ...(technicalDetails !== undefined && {
          technicalDetails: technicalDetails as Prisma.InputJsonValue,
        }),
        version: { increment: 1 },
      },
    });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        id,
        'LINE_SAVE',
        {
          stage: line.currentStage,
          versionBefore: line.version,
          version: updated.version,
          changeSummary,
          changes,
        },
        actorUserId,
      );
    }
    return updated;
  }

  async deleteManHour(
    lineItemId: string,
    entryId: string,
    roles: string[],
    actorUserId?: string,
  ) {
    const entry = await this.prisma.manHourEntry.findFirst({
      where: { id: entryId, lineItemId },
    });
    if (!entry) throw new NotFoundException('Man-hour entry not found');
    await this.assertEdit(roles, entry.stage);
    const deleted = await this.prisma.manHourEntry.delete({ where: { id: entryId } });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'MAN_HOUR_DELETE',
        { entryId, stage: entry.stage },
        actorUserId,
      );
    }
    return deleted;
  }

  async addTravel(
    lineItemId: string,
    roles: string[],
    data: {
      stage: WorkflowStage;
      shift?: string;
      workDate?: Date | null;
      tripLabel?: string;
      vehicleType?: string;
      tripMode?: 'ONE_WAY' | 'ROUND_TRIP';
      travelHours?: number;
      oneWayKm?: number;
      roundTripKm?: number;
      jobStatus?: string;
    },
    actorUserId?: string,
  ) {
    const line = await this.prisma.lineItem.findUnique({
      where: { id: lineItemId },
    });
    if (!line) throw new NotFoundException('Line item not found');
    await this.assertEdit(roles, data.stage);
    const created = await this.prisma.travelEntry.create({
      data: {
        lineItem: { connect: { id: lineItemId } },
        ...data,
      },
    });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'TRAVEL_ADD',
        { travelId: created.id, stage: data.stage },
        actorUserId,
      );
    }
    return created;
  }

  async deleteTravel(
    lineItemId: string,
    travelId: string,
    roles: string[],
    actorUserId?: string,
  ) {
    const row = await this.prisma.travelEntry.findFirst({
      where: { id: travelId, lineItemId },
    });
    if (!row) throw new NotFoundException('Travel row not found');
    await this.assertEdit(roles, row.stage);
    await this.prisma.travelEntry.delete({ where: { id: travelId } });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'TRAVEL_DELETE',
        { travelId, stage: row.stage },
        actorUserId,
      );
    }
    return { ok: true as const };
  }

  async addBom(
    lineItemId: string,
    roles: string[],
    data: {
      year?: number;
      month?: number;
      description?: string;
      qty?: number;
      materialSpec?: string;
    },
    actorUserId?: string,
  ) {
    const line = await this.prisma.lineItem.findUnique({
      where: { id: lineItemId },
    });
    if (!line) throw new NotFoundException('Line item not found');
    await this.assertEdit(
      roles,
      WorkflowStage.DESIGNING_ENGINEERING,
    );
    const created = await this.prisma.bomLine.create({
      data: {
        lineItem: { connect: { id: lineItemId } },
        ...data,
      },
    });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'BOM_ADD',
        { bomId: created.id },
        actorUserId,
      );
    }
    return created;
  }

  async deleteBom(
    lineItemId: string,
    bomId: string,
    roles: string[],
    actorUserId?: string,
  ) {
    const row = await this.prisma.bomLine.findFirst({
      where: { id: bomId, lineItemId },
    });
    if (!row) throw new NotFoundException('BOM line not found');
    await this.assertEdit(roles, WorkflowStage.DESIGNING_ENGINEERING);
    await this.prisma.bomLine.delete({ where: { id: bomId } });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'BOM_DELETE',
        { bomId },
        actorUserId,
      );
    }
    return { ok: true as const };
  }

  async createAttachment(input: {
    lineItemId: string;
    stage: WorkflowStage;
    filePath: string;
    fileName: string;
    mime?: string;
    sizeBytes: number;
    uploadedById: string;
    roles: string[];
  }) {
    const line = await this.prisma.lineItem.findUnique({
      where: { id: input.lineItemId },
    });
    if (!line) throw new NotFoundException('Line item not found');
    await this.assertEdit(input.roles, input.stage);
    const att = await this.prisma.attachment.create({
      data: {
        lineItemId: input.lineItemId,
        stage: input.stage,
        filePath: input.filePath,
        fileName: input.fileName,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
        uploadedById: input.uploadedById,
      },
    });
    await this.audit.log(
      'LineItem',
      input.lineItemId,
      'ATTACHMENT_UPLOAD',
      {
        attachmentId: att.id,
        stage: input.stage,
        fileName: input.fileName,
        mime: input.mime,
      },
      input.uploadedById,
    );
    return att;
  }

  async getHandoverGate(id: string) {
    return this.handoverGate.getHandoverGate(id);
  }

  async handover(
    id: string,
    roles: string[],
    userId: string,
    targetStage: WorkflowStage,
    note?: string,
  ) {
    const line = await this.prisma.lineItem.findUnique({
      where: { id },
      include: {
        project: true,
        manHours: true,
        travelRows: true,
        bomLines: true,
        attachments: true,
      },
    });
    if (!line) throw new NotFoundException('Line item not found');

    await this.assertEdit(roles, line.currentStage);

    const next = getNextStage(line.currentStage);
    if (!next) {
      throw new BadRequestException({
        message: 'Line is already at the final workflow stage',
        errors: ['No further handover — line is at Invoice.'],
      });
    }
    if (targetStage !== next) {
      throw new BadRequestException({
        message: 'Handover must move exactly one step forward',
        errors: [`Next stage must be ${next}`],
      });
    }

    const { ok, errors } = await this.handoverGate.validateExitFromCurrentStage(line);
    if (!ok) {
      throw new BadRequestException({
        message: 'Complete mandatory data for this step before handover',
        errors,
      });
    }

    const updated = await this.prisma.lineItem.update({
      where: { id },
      data: { currentStage: targetStage, version: { increment: 1 } },
    });

    await this.audit.log('LineItem', id, 'HANDOVER', {
      fromStage: line.currentStage,
      toStage: targetStage,
      note,
    }, userId);

    return updated;
  }

  async stageOverride(
    id: string,
    roles: string[],
    userId: string,
    targetStage: WorkflowStage,
    reason: string,
    version: number,
    markProjectComplete?: boolean,
  ) {
    const line = await this.prisma.lineItem.findUnique({ where: { id } });
    if (!line) throw new NotFoundException('Line item not found');
    if (line.version !== version) {
      throw new ConflictException({
        message: 'Version conflict',
        currentVersion: line.version,
      });
    }
    if (markProjectComplete && !roles.includes('admin')) {
      throw new ForbiddenException(
        'Only administrators can mark the project complete from a stage override.',
      );
    }
    await this.assertOverride(roles, targetStage);

    const updated = await this.prisma.lineItem.update({
      where: { id },
      data: { currentStage: targetStage, version: { increment: 1 } },
    });

    if (markProjectComplete) {
      await this.prisma.project.update({
        where: { id: line.projectId },
        data: { status: ProjectStatus.COMPLETE },
      });
    }

    await this.audit.log('LineItem', id, 'STAGE_OVERRIDE', {
      fromStage: line.currentStage,
      toStage: targetStage,
      reason,
      markProjectComplete: !!markProjectComplete,
      projectId: line.projectId,
    }, userId);

    return updated;
  }

  auditList(lineItemId: string) {
    return this.audit.listForEntity('LineItem', lineItemId);
  }

  async addManHour(
    lineItemId: string,
    roles: string[],
    data: {
      stage: WorkflowStage;
      year?: number;
      month?: number;
      shift?: string;
      workDate?: Date | null;
      idNumber?: string;
      category?: string;
      employeeName?: string;
      normalHours?: number;
      otHours?: number;
      totalHours?: number;
      jobStatus?: string;
      approvalStatus?: string;
      jobDescription?: string;
      rework?: string;
    },
    actorUserId?: string,
  ) {
    const line = await this.prisma.lineItem.findUnique({
      where: { id: lineItemId },
    });
    if (!line) throw new NotFoundException('Line item not found');
    await this.assertEdit(roles, data.stage);

    const created = await this.prisma.manHourEntry.create({
      data: {
        lineItem: { connect: { id: lineItemId } },
        stage: data.stage,
        year: data.year,
        month: data.month,
        shift: data.shift,
        workDate: data.workDate,
        idNumber: data.idNumber,
        category: data.category,
        employeeName: data.employeeName,
        normalHours: data.normalHours,
        otHours: data.otHours,
        totalHours: data.totalHours,
        jobStatus: data.jobStatus,
        approvalStatus: data.approvalStatus,
        jobDescription: data.jobDescription,
        rework: data.rework,
      },
    });
    if (actorUserId) {
      await this.audit.log(
        'LineItem',
        lineItemId,
        'MAN_HOUR_ADD',
        { entryId: created.id, stage: data.stage },
        actorUserId,
      );
    }
    return created;
  }
}

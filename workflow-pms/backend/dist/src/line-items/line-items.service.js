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
exports.LineItemsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
const handover_validation_service_1 = require("../workflow/handover-validation.service");
const workflow_constants_1 = require("../workflow/workflow.constants");
const workflow_access_service_1 = require("../workflow/workflow-access.service");
let LineItemsService = class LineItemsService {
    constructor(prisma, workflow, audit, handoverGate) {
        this.prisma = prisma;
        this.workflow = workflow;
        this.audit = audit;
        this.handoverGate = handoverGate;
    }
    listByProject(projectId) {
        return this.prisma.lineItem.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async get(id) {
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
        if (!li)
            throw new common_1.NotFoundException('Line item not found');
        return li;
    }
    canManageAttachment(att, userId, roles) {
        if (roles.includes('admin'))
            return true;
        if (att.uploadedById == null)
            return false;
        return att.uploadedById === userId;
    }
    async pipeAttachmentToResponse(res, lineItemId, attachmentId, userId, roles, opts) {
        const att = await this.prisma.attachment.findFirst({
            where: { id: attachmentId, lineItemId },
        });
        if (!att)
            throw new common_1.NotFoundException('Attachment not found');
        if (!this.canManageAttachment(att, userId, roles)) {
            throw new common_1.ForbiddenException('Only the user who uploaded this file (or an admin) may view or download it.');
        }
        if (!(0, fs_1.existsSync)(att.filePath)) {
            throw new common_1.NotFoundException('File not found on server');
        }
        res.setHeader('Content-Type', att.mime ?? 'application/octet-stream');
        const disp = opts?.inline ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', `${disp}; filename="${encodeURIComponent(att.fileName)}"`);
        const stream = (0, fs_1.createReadStream)(att.filePath);
        stream.on('error', () => {
            if (!res.headersSent)
                res.status(500).end();
        });
        stream.pipe(res);
    }
    async updateAttachment(lineItemId, attachmentId, userId, roles, dto) {
        const att = await this.prisma.attachment.findFirst({
            where: { id: attachmentId, lineItemId },
        });
        if (!att)
            throw new common_1.NotFoundException('Attachment not found');
        if (!this.canManageAttachment(att, userId, roles)) {
            throw new common_1.ForbiddenException('Only the uploader or an admin can change this attachment.');
        }
        const nextStage = dto.stage ?? att.stage;
        if (nextStage !== att.stage) {
            await this.assertEdit(roles, nextStage);
        }
        const oldPath = att.filePath;
        const data = { stage: nextStage };
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
        if (dto.file &&
            oldPath &&
            oldPath !== dto.file.path &&
            (0, fs_1.existsSync)(oldPath)) {
            try {
                await (0, promises_1.unlink)(oldPath);
            }
            catch {
            }
        }
        await this.audit.log('LineItem', lineItemId, dto.file ? 'ATTACHMENT_REPLACE' : 'ATTACHMENT_META_UPDATE', {
            attachmentId,
            stage: updated.stage,
            fileName: updated.fileName,
            replaced: !!dto.file,
        }, userId);
        return updated;
    }
    async deleteAttachment(lineItemId, attachmentId, userId, roles) {
        const att = await this.prisma.attachment.findFirst({
            where: { id: attachmentId, lineItemId },
        });
        if (!att)
            throw new common_1.NotFoundException('Attachment not found');
        if (!this.canManageAttachment(att, userId, roles)) {
            throw new common_1.ForbiddenException('Only the uploader or an admin can delete this attachment.');
        }
        if ((0, fs_1.existsSync)(att.filePath)) {
            try {
                await (0, promises_1.unlink)(att.filePath);
            }
            catch {
            }
        }
        await this.prisma.attachment.delete({ where: { id: attachmentId } });
        await this.audit.log('LineItem', lineItemId, 'ATTACHMENT_DELETE', { attachmentId, fileName: att.fileName }, userId);
        return { ok: true };
    }
    create(projectId, data, actorUserId) {
        return this.prisma.project.findUnique({ where: { id: projectId } }).then(async (p) => {
            if (!p)
                throw new common_1.NotFoundException('Project not found');
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
                await this.audit.log('LineItem', line.id, 'LINE_CREATE', { projectId, initialStage: data.currentStage }, actorUserId);
            }
            return line;
        });
    }
    async assertEdit(roles, stage) {
        const ok = await this.workflow.canAccessStage(roles, stage, 'edit');
        if (!ok) {
            throw new common_1.ForbiddenException('You do not have permission to edit line items in this workflow stage.');
        }
    }
    async assertOverride(roles, targetStage) {
        const ok = await this.workflow.canAccessStage(roles, targetStage, 'override');
        if (!ok) {
            throw new common_1.ForbiddenException('You do not have permission to override the workflow stage (admin or override role required).');
        }
    }
    async update(id, roles, data, actorUserId) {
        const line = await this.prisma.lineItem.findUnique({ where: { id } });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
        if (line.version !== data.version) {
            throw new common_1.ConflictException({
                message: 'Version conflict — row was updated elsewhere',
                currentVersion: line.version,
            });
        }
        await this.assertEdit(roles, line.currentStage);
        const { version, technicalDetails, ...rest } = data;
        const updated = await this.prisma.lineItem.update({
            where: { id },
            data: {
                ...rest,
                ...(technicalDetails !== undefined && {
                    technicalDetails: technicalDetails,
                }),
                version: { increment: 1 },
            },
        });
        if (actorUserId) {
            await this.audit.log('LineItem', id, 'LINE_SAVE', { stage: line.currentStage, version: updated.version }, actorUserId);
        }
        return updated;
    }
    async deleteManHour(lineItemId, entryId, roles, actorUserId) {
        const entry = await this.prisma.manHourEntry.findFirst({
            where: { id: entryId, lineItemId },
        });
        if (!entry)
            throw new common_1.NotFoundException('Man-hour entry not found');
        await this.assertEdit(roles, entry.stage);
        const deleted = await this.prisma.manHourEntry.delete({ where: { id: entryId } });
        if (actorUserId) {
            await this.audit.log('LineItem', lineItemId, 'MAN_HOUR_DELETE', { entryId, stage: entry.stage }, actorUserId);
        }
        return deleted;
    }
    async addTravel(lineItemId, roles, data, actorUserId) {
        const line = await this.prisma.lineItem.findUnique({
            where: { id: lineItemId },
        });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
        await this.assertEdit(roles, data.stage);
        const created = await this.prisma.travelEntry.create({
            data: {
                lineItem: { connect: { id: lineItemId } },
                ...data,
            },
        });
        if (actorUserId) {
            await this.audit.log('LineItem', lineItemId, 'TRAVEL_ADD', { travelId: created.id, stage: data.stage }, actorUserId);
        }
        return created;
    }
    async deleteTravel(lineItemId, travelId, roles, actorUserId) {
        const row = await this.prisma.travelEntry.findFirst({
            where: { id: travelId, lineItemId },
        });
        if (!row)
            throw new common_1.NotFoundException('Travel row not found');
        await this.assertEdit(roles, row.stage);
        await this.prisma.travelEntry.delete({ where: { id: travelId } });
        if (actorUserId) {
            await this.audit.log('LineItem', lineItemId, 'TRAVEL_DELETE', { travelId, stage: row.stage }, actorUserId);
        }
        return { ok: true };
    }
    async addBom(lineItemId, roles, data, actorUserId) {
        const line = await this.prisma.lineItem.findUnique({
            where: { id: lineItemId },
        });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
        await this.assertEdit(roles, client_1.WorkflowStage.DESIGNING_ENGINEERING);
        const created = await this.prisma.bomLine.create({
            data: {
                lineItem: { connect: { id: lineItemId } },
                ...data,
            },
        });
        if (actorUserId) {
            await this.audit.log('LineItem', lineItemId, 'BOM_ADD', { bomId: created.id }, actorUserId);
        }
        return created;
    }
    async deleteBom(lineItemId, bomId, roles, actorUserId) {
        const row = await this.prisma.bomLine.findFirst({
            where: { id: bomId, lineItemId },
        });
        if (!row)
            throw new common_1.NotFoundException('BOM line not found');
        await this.assertEdit(roles, client_1.WorkflowStage.DESIGNING_ENGINEERING);
        await this.prisma.bomLine.delete({ where: { id: bomId } });
        if (actorUserId) {
            await this.audit.log('LineItem', lineItemId, 'BOM_DELETE', { bomId }, actorUserId);
        }
        return { ok: true };
    }
    async createAttachment(input) {
        const line = await this.prisma.lineItem.findUnique({
            where: { id: input.lineItemId },
        });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
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
        await this.audit.log('LineItem', input.lineItemId, 'ATTACHMENT_UPLOAD', {
            attachmentId: att.id,
            stage: input.stage,
            fileName: input.fileName,
            mime: input.mime,
        }, input.uploadedById);
        return att;
    }
    async getHandoverGate(id) {
        return this.handoverGate.getHandoverGate(id);
    }
    async handover(id, roles, userId, targetStage, note) {
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
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
        await this.assertEdit(roles, line.currentStage);
        const next = (0, workflow_constants_1.getNextStage)(line.currentStage);
        if (!next) {
            throw new common_1.BadRequestException({
                message: 'Line is already at the final workflow stage',
                errors: ['No further handover — line is at Invoice.'],
            });
        }
        if (targetStage !== next) {
            throw new common_1.BadRequestException({
                message: 'Handover must move exactly one step forward',
                errors: [`Next stage must be ${next}`],
            });
        }
        const { ok, errors } = await this.handoverGate.validateExitFromCurrentStage(line);
        if (!ok) {
            throw new common_1.BadRequestException({
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
    async stageOverride(id, roles, userId, targetStage, reason, version) {
        const line = await this.prisma.lineItem.findUnique({ where: { id } });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
        if (line.version !== version) {
            throw new common_1.ConflictException({
                message: 'Version conflict',
                currentVersion: line.version,
            });
        }
        await this.assertOverride(roles, targetStage);
        const updated = await this.prisma.lineItem.update({
            where: { id },
            data: { currentStage: targetStage, version: { increment: 1 } },
        });
        await this.audit.log('LineItem', id, 'STAGE_OVERRIDE', {
            fromStage: line.currentStage,
            toStage: targetStage,
            reason,
        }, userId);
        return updated;
    }
    auditList(lineItemId) {
        return this.audit.listForEntity('LineItem', lineItemId);
    }
    async addManHour(lineItemId, roles, data, actorUserId) {
        const line = await this.prisma.lineItem.findUnique({
            where: { id: lineItemId },
        });
        if (!line)
            throw new common_1.NotFoundException('Line item not found');
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
            await this.audit.log('LineItem', lineItemId, 'MAN_HOUR_ADD', { entryId: created.id, stage: data.stage }, actorUserId);
        }
        return created;
    }
};
exports.LineItemsService = LineItemsService;
exports.LineItemsService = LineItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_access_service_1.WorkflowAccessService,
        audit_service_1.AuditService,
        handover_validation_service_1.HandoverValidationService])
], LineItemsService);
//# sourceMappingURL=line-items.service.js.map
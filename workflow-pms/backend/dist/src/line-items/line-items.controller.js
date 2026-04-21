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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineItemsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_bom_dto_1 = require("./dtos/create-bom.dto");
const create_line_item_dto_1 = require("./dtos/create-line-item.dto");
const man_hour_dto_1 = require("./dtos/man-hour.dto");
const create_travel_dto_1 = require("./dtos/create-travel.dto");
const update_attachment_dto_1 = require("./dtos/update-attachment.dto");
const upload_attachment_dto_1 = require("./dtos/upload-attachment.dto");
const handover_dto_1 = require("./dtos/handover.dto");
const stage_override_dto_1 = require("./dtos/stage-override.dto");
const update_line_item_dto_1 = require("./dtos/update-line-item.dto");
const line_items_service_1 = require("./line-items.service");
const lineItemAttachmentStorage = (0, multer_1.diskStorage)({
    destination: (req, file, cb) => {
        const root = process.env.FILE_STORAGE_PATH ?? (0, path_1.join)(process.cwd(), 'uploads');
        const dir = (0, path_1.join)(root, 'line-items');
        if (!(0, fs_1.existsSync)(dir))
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safe}`);
    },
});
const lineItemAttachmentUpload = {
    limits: { fileSize: 12 * 1024 * 1024 },
    storage: lineItemAttachmentStorage,
};
let LineItemsController = class LineItemsController {
    constructor(lineItems) {
        this.lineItems = lineItems;
    }
    listByProject(projectId) {
        return this.lineItems.listByProject(projectId);
    }
    create(projectId, user, dto) {
        return this.lineItems.create(projectId, {
            ...dto,
            measurementDate: dto.measurementDate
                ? new Date(dto.measurementDate)
                : undefined,
            targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        }, user.sub);
    }
    get(id) {
        return this.lineItems.get(id);
    }
    handoverGate(id) {
        return this.lineItems.getHandoverGate(id);
    }
    update(id, user, dto) {
        return this.lineItems.update(id, user.roles, {
            inputDrawingNumber: dto.inputDrawingNumber,
            drawingNumber: dto.drawingNumber,
            sheetNo: dto.sheetNo,
            revNo: dto.revNo,
            clampType: dto.clampType,
            material: dto.material,
            description: dto.description,
            qty: dto.qty,
            unitWeight: dto.unitWeight,
            totalWeight: dto.totalWeight,
            measurementDate: dto.measurementDate
                ? new Date(dto.measurementDate)
                : undefined,
            targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
            currentStage: dto.currentStage,
            invoiceAmountSar: dto.invoiceAmountSar,
            technicalDetails: dto.technicalDetails,
            coordDesignRequestedAt: dto.coordDesignRequestedAt
                ? new Date(dto.coordDesignRequestedAt)
                : undefined,
            coordEngineeringSubmittedAt: dto.coordEngineeringSubmittedAt
                ? new Date(dto.coordEngineeringSubmittedAt)
                : undefined,
            coordApprovalStatus: dto.coordApprovalStatus,
            coordDescription: dto.coordDescription,
            version: dto.version,
        }, user.sub);
    }
    handover(id, user, dto) {
        return this.lineItems.handover(id, user.roles, user.sub, dto.targetStage, dto.note);
    }
    stageOverride(id, user, dto) {
        return this.lineItems.stageOverride(id, user.roles, user.sub, dto.targetStage, dto.reason, dto.version);
    }
    audit(id) {
        return this.lineItems.auditList(id);
    }
    addManHour(id, user, dto) {
        return this.lineItems.addManHour(id, user.roles, {
            ...dto,
            workDate: dto.workDate ? new Date(dto.workDate) : undefined,
        }, user.sub);
    }
    removeManHour(lineId, entryId, user) {
        return this.lineItems.deleteManHour(lineId, entryId, user.roles, user.sub);
    }
    addTravel(id, user, dto) {
        return this.lineItems.addTravel(id, user.roles, {
            ...dto,
            workDate: dto.workDate ? new Date(dto.workDate) : undefined,
        }, user.sub);
    }
    removeTravel(lineId, travelId, user) {
        return this.lineItems.deleteTravel(lineId, travelId, user.roles, user.sub);
    }
    addBom(id, user, dto) {
        return this.lineItems.addBom(id, user.roles, dto, user.sub);
    }
    removeBom(lineId, bomId, user) {
        return this.lineItems.deleteBom(lineId, bomId, user.roles, user.sub);
    }
    async uploadAttachment(lineItemId, file, user, body) {
        if (!file) {
            throw new common_1.BadRequestException('No file received. Ensure the request is multipart/form-data with field name "file".');
        }
        return this.lineItems.createAttachment({
            lineItemId,
            stage: body.stage,
            filePath: file.path,
            fileName: file.originalname,
            mime: file.mimetype,
            sizeBytes: file.size,
            uploadedById: user.sub,
            roles: user.roles,
        });
    }
    async downloadAttachment(lineId, attachmentId, inline, user, res) {
        await this.lineItems.pipeAttachmentToResponse(res, lineId, attachmentId, user.sub, user.roles, { inline: inline === '1' || inline === 'true' });
    }
    updateAttachment(lineId, attachmentId, file, user, body) {
        return this.lineItems.updateAttachment(lineId, attachmentId, user.sub, user.roles, {
            stage: body.stage,
            file: file
                ? {
                    path: file.path,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                }
                : undefined,
        });
    }
    deleteAttachment(lineId, attachmentId, user) {
        return this.lineItems.deleteAttachment(lineId, attachmentId, user.sub, user.roles);
    }
};
exports.LineItemsController = LineItemsController;
__decorate([
    (0, common_1.Get)('projects/:projectId/line-items'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "listByProject", null);
__decorate([
    (0, common_1.Post)('projects/:projectId/line-items'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'site_measurement'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_line_item_dto_1.CreateLineItemDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('line-items/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('line-items/:id/handover-gate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "handoverGate", null);
__decorate([
    (0, common_1.Patch)('line-items/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_line_item_dto_1.UpdateLineItemDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('line-items/:id/handover'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, handover_dto_1.HandoverDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "handover", null);
__decorate([
    (0, common_1.Post)('line-items/:id/stage-override'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, stage_override_dto_1.StageOverrideDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "stageOverride", null);
__decorate([
    (0, common_1.Get)('line-items/:id/audit'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "audit", null);
__decorate([
    (0, common_1.Post)('line-items/:id/man-hours'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, man_hour_dto_1.CreateManHourDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "addManHour", null);
__decorate([
    (0, common_1.Delete)('line-items/:lineId/man-hours/:entryId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('entryId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "removeManHour", null);
__decorate([
    (0, common_1.Post)('line-items/:id/travel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_travel_dto_1.CreateTravelDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "addTravel", null);
__decorate([
    (0, common_1.Delete)('line-items/:lineId/travel/:travelId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('travelId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "removeTravel", null);
__decorate([
    (0, common_1.Post)('line-items/:id/bom'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_bom_dto_1.CreateBomDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "addBom", null);
__decorate([
    (0, common_1.Delete)('line-items/:lineId/bom/:bomId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('bomId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "removeBom", null);
__decorate([
    (0, common_1.Post)('line-items/:id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', lineItemAttachmentUpload)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, upload_attachment_dto_1.UploadAttachmentDto]),
    __metadata("design:returntype", Promise)
], LineItemsController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Get)('line-items/:lineId/attachments/:attachmentId/file'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, common_1.Query)('inline')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LineItemsController.prototype, "downloadAttachment", null);
__decorate([
    (0, common_1.Patch)('line-items/:lineId/attachments/:attachmentId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', lineItemAttachmentUpload)),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object, update_attachment_dto_1.UpdateAttachmentDto]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "updateAttachment", null);
__decorate([
    (0, common_1.Delete)('line-items/:lineId/attachments/:attachmentId'),
    __param(0, (0, common_1.Param)('lineId')),
    __param(1, (0, common_1.Param)('attachmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LineItemsController.prototype, "deleteAttachment", null);
exports.LineItemsController = LineItemsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [line_items_service_1.LineItemsService])
], LineItemsController);
//# sourceMappingURL=line-items.controller.js.map
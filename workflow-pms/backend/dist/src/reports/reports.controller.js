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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    constructor(reports) {
        this.reports = reports;
    }
    projectStatus(projectId) {
        if (!projectId)
            throw new common_1.BadRequestException('projectId query required');
        return this.reports.getProjectStatus(projectId);
    }
    portfolioCost(user) {
        return this.reports.portfolioCostSummary(user.roles);
    }
    costSummary(projectId) {
        if (!projectId)
            throw new common_1.BadRequestException('projectId query required');
        return this.reports.getCostSummary(projectId);
    }
    async projectStatusCsv(projectId) {
        if (!projectId)
            throw new common_1.BadRequestException('projectId query required');
        const rows = await this.reports.getProjectStatus(projectId);
        if (!rows.length)
            return '';
        const keys = Object.keys(rows[0]);
        return this.reports.toCsv(keys, rows);
    }
    async costSummaryCsv(projectId) {
        if (!projectId)
            throw new common_1.BadRequestException('projectId query required');
        const rows = await this.reports.getCostSummary(projectId);
        if (!rows.length)
            return '';
        const keys = Object.keys(rows[0]);
        return this.reports.toCsv(keys, rows);
    }
    async projectStatusPdf(projectId) {
        if (!projectId)
            throw new common_1.BadRequestException('projectId query required');
        const buf = await this.reports.generateProjectStatusPdf(projectId);
        return new common_1.StreamableFile(buf, {
            type: 'application/pdf',
            disposition: `attachment; filename=ProjectStatus_${projectId.slice(0, 8)}.pdf`,
        });
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('project-status'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "projectStatus", null);
__decorate([
    (0, common_1.Get)('portfolio-cost'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "portfolioCost", null);
__decorate([
    (0, common_1.Get)('cost-summary'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "costSummary", null);
__decorate([
    (0, common_1.Get)('project-status.csv'),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="project-status.csv"'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "projectStatusCsv", null);
__decorate([
    (0, common_1.Get)('cost-summary.csv'),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="cost-summary.csv"'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "costSummaryCsv", null);
__decorate([
    (0, common_1.Get)('project-status.pdf'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "projectStatusPdf", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map
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
exports.ProjectsService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const role_workflow_1 = require("../common/role-workflow");
let ProjectsService = class ProjectsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(roleSlugs, includeArchived = false, userId) {
        const activeOnly = !includeArchived || !(0, role_workflow_1.isAdmin)(roleSlugs)
            ? { status: client_1.ProjectStatus.ACTIVE }
            : {};
        if ((0, role_workflow_1.isAdmin)(roleSlugs)) {
            return this.prisma.project.findMany({
                where: activeOnly,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: { select: { lineItems: true } },
                },
            });
        }
        const stages = (0, role_workflow_1.stagesForRoles)(roleSlugs);
        if (!stages.length) {
            return [];
        }
        return this.prisma.project.findMany({
            where: {
                ...activeOnly,
                OR: [
                    { lineItems: { some: { currentStage: { in: stages } } } },
                    ...(userId ? [{ createdById: userId }] : []),
                ],
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: {
                        lineItems: { where: { currentStage: { in: stages } } },
                    },
                },
            },
        });
    }
    async dashboardSummary(roleSlugs) {
        if ((0, role_workflow_1.isAdmin)(roleSlugs)) {
            const rows = await this.prisma.lineItem.groupBy({
                by: ['currentStage'],
                where: { project: { status: client_1.ProjectStatus.ACTIVE } },
                _count: { _all: true },
            });
            const byStage = {};
            for (const r of rows) {
                byStage[r.currentStage] = r._count._all;
            }
            const totalProjects = await this.prisma.project.count({
                where: { status: client_1.ProjectStatus.ACTIVE },
            });
            const totalLines = await this.prisma.lineItem.count({
                where: { project: { status: client_1.ProjectStatus.ACTIVE } },
            });
            return { scope: 'all', totalProjects, totalLines, byStage };
        }
        const stages = (0, role_workflow_1.stagesForRoles)(roleSlugs);
        if (!stages.length) {
            return { scope: 'mine', myProjectCount: 0, myLineCount: 0, byStage: {} };
        }
        const mine = await this.prisma.lineItem.findMany({
            where: {
                currentStage: { in: stages },
                project: { status: client_1.ProjectStatus.ACTIVE },
            },
            select: { projectId: true, id: true, currentStage: true },
        });
        const projIds = new Set(mine.map((l) => l.projectId));
        const byStage = {};
        for (const l of mine) {
            byStage[l.currentStage] = (byStage[l.currentStage] ?? 0) + 1;
        }
        return {
            scope: 'mine',
            myProjectCount: projIds.size,
            myLineCount: mine.length,
            byStage,
        };
    }
    async linesByProjectTop(roleSlugs, limit = 16) {
        const active = { status: client_1.ProjectStatus.ACTIVE };
        const where = (0, role_workflow_1.isAdmin)(roleSlugs)
            ? { project: active }
            : {
                currentStage: { in: (0, role_workflow_1.stagesForRoles)(roleSlugs) },
                project: active,
            };
        const grouped = await this.prisma.lineItem.groupBy({
            by: ['projectId'],
            where,
            _count: { _all: true },
        });
        if (!grouped.length) {
            return { rows: [] };
        }
        const projects = await this.prisma.project.findMany({
            where: { id: { in: grouped.map((g) => g.projectId) } },
            select: { id: true, projectId: true, projectName: true },
        });
        const projMap = new Map(projects.map((p) => [p.id, p]));
        const rows = grouped
            .map((g) => {
            const p = projMap.get(g.projectId);
            return {
                projectId: g.projectId,
                label: (p?.projectName || p?.projectId || g.projectId),
                lineCount: g._count._all,
            };
        })
            .sort((a, b) => b.lineCount - a.lineCount)
            .slice(0, limit);
        return { rows };
    }
    async get(id, roleSlugs, userId) {
        const p = await this.prisma.project.findUnique({
            where: { id },
            include: {
                lineItems: { orderBy: { createdAt: 'asc' } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });
        if (!p)
            throw new common_1.NotFoundException('Project not found');
        if (!(0, role_workflow_1.isAdmin)(roleSlugs) && p.status === client_1.ProjectStatus.ARCHIVED) {
            throw new common_1.ForbiddenException('This project is archived.');
        }
        if ((0, role_workflow_1.isAdmin)(roleSlugs))
            return p;
        const stages = (0, role_workflow_1.stagesForRoles)(roleSlugs);
        const visible = p.lineItems.filter((l) => stages.includes(l.currentStage));
        const isCreator = !!(userId && p.createdById === userId);
        if (visible.length) {
            return { ...p, lineItems: visible };
        }
        if (isCreator) {
            return { ...p, lineItems: [] };
        }
        throw new common_1.ForbiddenException('This project has no line items in your workflow stages — you cannot access it.');
    }
    create(userId, data) {
        const trimmedId = data.projectId?.trim();
        const name = data.projectName?.trim();
        if (!trimmedId && !name) {
            throw new common_1.BadRequestException('Provide a project name and/or project ID — a project ID will be generated if omitted.');
        }
        const projectId = trimmedId || this.generateProjectId(name);
        return this.prisma.project.create({
            data: {
                projectName: name ?? data.projectName,
                year: data.year,
                month: data.month,
                area: data.area,
                client: data.client,
                plant: data.plant,
                poNumber: data.poNumber,
                projectId,
                bidNumber: data.bidNumber,
                createdById: userId,
                status: client_1.ProjectStatus.ACTIVE,
            },
        });
    }
    generateProjectId(projectName) {
        const base = projectName
            ?.normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 40) || 'PRJ';
        const safe = base.length ? base : 'PRJ';
        const suffix = (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase();
        return `${safe}-${suffix}`;
    }
    async update(id, data) {
        await this.ensure(id);
        return this.prisma.project.update({
            where: { id },
            data,
        });
    }
    async ensure(id) {
        const p = await this.prisma.project.findUnique({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException('Project not found');
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map
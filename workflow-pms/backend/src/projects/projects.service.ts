import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, WorkflowStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isAdmin, stagesForRoles } from '../common/role-workflow';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Project list rows include `singleJobStage` when the project has exactly one job
   * (line item) in scope — UI can show workflow stage on the tile only in that case.
   */
  private toProjectListRow<
    T extends {
      _count: { lineItems: number };
      lineItems: { currentStage: WorkflowStage }[];
    },
  >(p: T): Omit<T, 'lineItems'> & { singleJobStage: WorkflowStage | null } {
    const { lineItems, ...rest } = p;
    const count = p._count.lineItems;
    const singleJobStage =
      count === 1 && lineItems.length === 1 ? lineItems[0]!.currentStage : null;
    return { ...rest, singleJobStage };
  }

  async list(
    roleSlugs: string[],
    includeArchived = false,
    /** Lets non-admin creators see projects they created before any line exists. */
    userId?: string,
  ) {
    /** Not archived: active work + complete (but not cold-storage archive) */
    const notArchived: Prisma.ProjectWhereInput = {
      status: { in: [ProjectStatus.ACTIVE, ProjectStatus.COMPLETE] },
    };
    const listFilter: Prisma.ProjectWhereInput =
      !includeArchived || !isAdmin(roleSlugs) ? notArchived : {};

    if (isAdmin(roleSlugs)) {
      const rows = await this.prisma.project.findMany({
        where: listFilter,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { lineItems: true } },
          lineItems: {
            take: 2,
            orderBy: { createdAt: 'asc' },
            select: { currentStage: true },
          },
        },
      });
      return rows.map((p) => this.toProjectListRow(p));
    }
    const stages = stagesForRoles(roleSlugs);
    if (!stages.length) {
      return [];
    }
    const rows = await this.prisma.project.findMany({
      where: {
        ...listFilter,
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
        lineItems: {
          where: { currentStage: { in: stages } },
          take: 2,
          orderBy: { createdAt: 'asc' },
          select: { currentStage: true },
        },
      },
    });
    return rows.map((p) => this.toProjectListRow(p));
  }

  /** Stage counts across all lines (admin) or only lines in user's stages */
  async dashboardSummary(roleSlugs: string[]) {
    if (isAdmin(roleSlugs)) {
      const rows = await this.prisma.lineItem.groupBy({
        by: ['currentStage'],
        where: { project: { status: ProjectStatus.ACTIVE } },
        _count: { _all: true },
      });
      const byStage: Partial<Record<WorkflowStage, number>> = {};
      for (const r of rows) {
        byStage[r.currentStage] = r._count._all;
      }
      const totalProjects = await this.prisma.project.count({
        where: { status: ProjectStatus.ACTIVE },
      });
      const totalLines = await this.prisma.lineItem.count({
        where: { project: { status: ProjectStatus.ACTIVE } },
      });
      return { scope: 'all' as const, totalProjects, totalLines, byStage };
    }
    const stages = stagesForRoles(roleSlugs);
    if (!stages.length) {
      return { scope: 'mine' as const, myProjectCount: 0, myLineCount: 0, byStage: {} };
    }
    const mine = await this.prisma.lineItem.findMany({
      where: {
        currentStage: { in: stages },
        project: { status: ProjectStatus.ACTIVE },
      },
      select: { projectId: true, id: true, currentStage: true },
    });
    const projIds = new Set(mine.map((l) => l.projectId));
    const byStage: Partial<Record<WorkflowStage, number>> = {};
    for (const l of mine) {
      byStage[l.currentStage] = (byStage[l.currentStage] ?? 0) + 1;
    }
    return {
      scope: 'mine' as const,
      myProjectCount: projIds.size,
      myLineCount: mine.length,
      byStage,
    };
  }

  /** Top projects by line count (for Olls stats charts). */
  async linesByProjectTop(roleSlugs: string[], limit = 16) {
    const active = { status: ProjectStatus.ACTIVE };
    const where = isAdmin(roleSlugs)
      ? { project: active }
      : {
          currentStage: { in: stagesForRoles(roleSlugs) },
          project: active,
        };

    const grouped = await this.prisma.lineItem.groupBy({
      by: ['projectId'],
      where,
      _count: { _all: true },
    });

    if (!grouped.length) {
      return { rows: [] as { projectId: string; label: string; lineCount: number }[] };
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
          label: (p?.projectName || p?.projectId || g.projectId) as string,
          lineCount: g._count._all,
        };
      })
      .sort((a, b) => b.lineCount - a.lineCount)
      .slice(0, limit);

    return { rows };
  }

  async get(id: string, roleSlugs: string[], userId?: string) {
    const p = await this.prisma.project.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!p) throw new NotFoundException('Project not found');

    if (!isAdmin(roleSlugs) && p.status === ProjectStatus.ARCHIVED) {
      throw new ForbiddenException('This project is archived.');
    }

    if (isAdmin(roleSlugs)) return p;

    const stages = stagesForRoles(roleSlugs);
    const visible = p.lineItems.filter((l) => stages.includes(l.currentStage));
    const isCreator = !!(userId && p.createdById === userId);
    if (visible.length) {
      return { ...p, lineItems: visible };
    }
    if (isCreator) {
      return { ...p, lineItems: [] };
    }
    throw new ForbiddenException(
      'This project has no line items in your workflow stages — you cannot access it.',
    );
  }

  create(
    userId: string | undefined,
    data: {
      projectName?: string;
      year?: number;
      month?: number;
      area?: string;
      client?: string;
      plant?: string;
      poNumber?: string;
      projectId?: string;
      bidNumber?: string;
    },
  ) {
    const trimmedId = data.projectId?.trim();
    const name = data.projectName?.trim();
    if (!trimmedId && !name) {
      throw new BadRequestException(
        'Provide a project name and/or project ID — a project ID will be generated if omitted.'
      );
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
        status: ProjectStatus.ACTIVE,
      },
    });
  }

  private generateProjectId(projectName?: string): string {
    const base =
      projectName
        ?.normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40) || 'PRJ';
    const safe = base.length ? base : 'PRJ';
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `${safe}-${suffix}`;
  }

  async update(
    id: string,
    roleSlugs: string[],
    userId: string | undefined,
    data: {
      projectName?: string;
      year?: number;
      month?: number;
      area?: string;
      client?: string;
      plant?: string;
      poNumber?: string;
      projectId?: string;
      bidNumber?: string;
      status?: ProjectStatus;
    },
  ) {
    const p = await this.prisma.project.findUnique({
      where: { id },
      include: {
        lineItems: { select: { currentStage: true } },
      },
    });
    if (!p) throw new NotFoundException('Project not found');

    if (isAdmin(roleSlugs)) {
      return this.prisma.project.update({
        where: { id },
        data,
      });
    }

    if (!roleSlugs.includes('site_measurement')) {
      throw new ForbiddenException('Not permitted to update this project');
    }

    if (p.status === ProjectStatus.ARCHIVED) {
      throw new ForbiddenException('This project is archived.');
    }
    const stages = stagesForRoles(roleSlugs);
    const visible = p.lineItems.filter((l) => stages.includes(l.currentStage));
    const isCreator = !!(userId && p.createdById === userId);
    if (!visible.length && !isCreator) {
      throw new ForbiddenException(
        'This project has no line items in your workflow stages — you cannot access it.',
      );
    }

    const headerPayload: {
      projectName?: string;
      year?: number;
      month?: number;
      area?: string;
      client?: string;
      plant?: string;
      poNumber?: string;
      projectId?: string;
      bidNumber?: string;
    } = {};
    if (data.projectName !== undefined) headerPayload.projectName = data.projectName;
    if (data.year !== undefined) headerPayload.year = data.year;
    if (data.month !== undefined) headerPayload.month = data.month;
    if (data.area !== undefined) headerPayload.area = data.area;
    if (data.client !== undefined) headerPayload.client = data.client;
    if (data.plant !== undefined) headerPayload.plant = data.plant;
    if (data.poNumber !== undefined) headerPayload.poNumber = data.poNumber;
    if (data.projectId !== undefined) headerPayload.projectId = data.projectId;
    if (data.bidNumber !== undefined) headerPayload.bidNumber = data.bidNumber;

    return this.prisma.project.update({
      where: { id },
      data: headerPayload,
    });
  }
}

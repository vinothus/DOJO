import { Injectable } from '@nestjs/common';
import { WorkflowStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type StageAction = 'view' | 'edit' | 'override';

@Injectable()
export class WorkflowAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin role slug bypasses DB checks */
  async canAccessStage(
    roleSlugs: string[],
    stage: WorkflowStage,
    action: StageAction,
  ): Promise<boolean> {
    if (roleSlugs.includes('admin')) return true;

    const roles = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs } },
      select: { id: true },
    });
    const roleIds = roles.map((r) => r.id);
    if (!roleIds.length) return false;

    const rows = await this.prisma.roleStageAccess.findMany({
      where: { stage, roleId: { in: roleIds } },
    });

    return this.matchAction(rows, action);
  }

  private matchAction(
    rows: { canView: boolean; canEdit: boolean; canOverride: boolean }[],
    action: StageAction,
  ): boolean {
    if (action === 'view') return rows.some((r) => r.canView);
    if (action === 'edit') return rows.some((r) => r.canEdit);
    return rows.some((r) => r.canOverride);
  }
}

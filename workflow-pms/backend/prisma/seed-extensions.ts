import { Prisma, PrismaClient, WorkflowStage } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_WORKSPACE } from '../src/settings/workspace-settings.types';

/** Safe on existing DBs: workspace row + coordinator role/stage access + demo user. */
export async function ensurePostDeployBootstrap(prisma: PrismaClient): Promise<void> {
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      workspace: DEFAULT_WORKSPACE as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });

  const stages = Object.values(WorkflowStage);
  const coord = await prisma.role.upsert({
    where: { slug: 'coordinator' },
    create: {
      slug: 'coordinator',
      name: 'Co-ordinator',
    },
    update: { name: 'Co-ordinator' },
  });

  for (const s of stages) {
    const isOwn = s === WorkflowStage.COORDINATION;
    await prisma.roleStageAccess.upsert({
      where: {
        roleId_stage: { roleId: coord.id, stage: s },
      },
      create: {
        roleId: coord.id,
        stage: s,
        canView: isOwn,
        canEdit: isOwn,
        canOverride: false,
      },
      update: {
        canView: isOwn,
        canEdit: isOwn,
      },
    });
  }

  const exists = await prisma.user.findUnique({
    where: { email: 'coordinator@example.com' },
  });
  if (!exists) {
    const hash = await bcrypt.hash('Coordinator123!', 10);
    await prisma.user.create({
      data: {
        email: 'coordinator@example.com',
        name: 'Co-ordinator User',
        passwordHash: hash,
        roles: { create: [{ roleId: coord.id }] },
      },
    });
    console.log('Co-ordinator demo user created — coordinator@example.com');
  }
}

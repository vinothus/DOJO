import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_WORKSPACE,
  mergeWorkspace,
  patchWorkspace,
  type WorkspaceSettingsV1,
} from './workspace-settings.types';

@Injectable()
export class WorkspaceSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<WorkspaceSettingsV1> {
    const row = await this.prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });
    return mergeWorkspace(row?.workspace ?? {});
  }

  async patch(workspace: unknown): Promise<WorkspaceSettingsV1> {
    const current = await this.get();
    const merged = patchWorkspace(current, workspace);
    await this.prisma.systemSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        workspace: merged as unknown as Prisma.InputJsonValue,
      },
      update: { workspace: merged as unknown as Prisma.InputJsonValue },
    });
    return merged;
  }

  /** Ensure row exists with defaults (idempotent). */
  async ensureDefaults(): Promise<void> {
    const row = await this.prisma.systemSettings.findUnique({
      where: { id: 'default' },
    });
    if (!row) {
      await this.prisma.systemSettings.create({
        data: {
          id: 'default',
          workspace: DEFAULT_WORKSPACE as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }
}

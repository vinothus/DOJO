import { PrismaService } from '../prisma/prisma.service';
import { type WorkspaceSettingsV1 } from './workspace-settings.types';
export declare class WorkspaceSettingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(): Promise<WorkspaceSettingsV1>;
    patch(workspace: unknown): Promise<WorkspaceSettingsV1>;
    ensureDefaults(): Promise<void>;
}

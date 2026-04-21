import { WorkflowStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type StageAction = 'view' | 'edit' | 'override';
export declare class WorkflowAccessService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    canAccessStage(roleSlugs: string[], stage: WorkflowStage, action: StageAction): Promise<boolean>;
    private matchAction;
}

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(entityType: string, entityId: string, action: string, payload?: Record<string, unknown>, userId?: string): Prisma.Prisma__AuditLogClient<{
        id: string;
        createdAt: Date;
        userId: string | null;
        entityType: string;
        entityId: string;
        action: string;
        payload: Prisma.JsonValue | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    listForEntity(entityType: string, entityId: string): Prisma.PrismaPromise<({
        user: {
            id: string;
            name: string;
            email: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        entityType: string;
        entityId: string;
        action: string;
        payload: Prisma.JsonValue | null;
    })[]>;
}

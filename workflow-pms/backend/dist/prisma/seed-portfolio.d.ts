import { PrismaClient } from '@prisma/client';
export declare function ensureSamplePortfolio(prisma: PrismaClient, adminUserId: string): Promise<void>;

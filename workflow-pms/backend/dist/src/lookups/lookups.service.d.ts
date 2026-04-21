import { PrismaService } from '../prisma/prisma.service';
export declare class LookupsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listByCode(code: string): Promise<{
        values: {
            id: string;
            createdAt: Date;
            value: string;
            sortOrder: number;
            lookupTypeId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        code: string;
    }>;
    addValue(code: string, value: string): Promise<{
        id: string;
        createdAt: Date;
        value: string;
        sortOrder: number;
        lookupTypeId: string;
    }>;
}

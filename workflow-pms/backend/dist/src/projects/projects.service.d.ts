import { PrismaService } from '../prisma/prisma.service';
import { ProjectStatus } from '@prisma/client';
export declare class ProjectsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(roleSlugs: string[], includeArchived?: boolean, userId?: string): never[] | import(".prisma/client").Prisma.PrismaPromise<({
        _count: {
            lineItems: number;
        };
    } & {
        year: number | null;
        month: number | null;
        area: string | null;
        client: string | null;
        plant: string | null;
        poNumber: string | null;
        bidNumber: string | null;
        projectId: string;
        projectName: string | null;
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdById: string | null;
    })[]>;
    dashboardSummary(roleSlugs: string[]): Promise<{
        scope: "all";
        totalProjects: number;
        totalLines: number;
        byStage: Partial<Record<import(".prisma/client").$Enums.WorkflowStage, number>>;
        myProjectCount?: undefined;
        myLineCount?: undefined;
    } | {
        scope: "mine";
        myProjectCount: number;
        myLineCount: number;
        byStage: Partial<Record<import(".prisma/client").$Enums.WorkflowStage, number>>;
        totalProjects?: undefined;
        totalLines?: undefined;
    }>;
    linesByProjectTop(roleSlugs: string[], limit?: number): Promise<{
        rows: {
            projectId: string;
            label: string;
            lineCount: number;
        }[];
    }>;
    get(id: string, roleSlugs: string[], userId?: string): Promise<{
        createdBy: {
            id: string;
            name: string;
            email: string;
        } | null;
        lineItems: {
            projectId: string;
            version: number;
            id: string;
            updatedAt: Date;
            createdAt: Date;
            inputDrawingNumber: string | null;
            drawingNumber: string | null;
            sheetNo: string | null;
            revNo: string | null;
            clampType: string | null;
            material: string | null;
            description: string | null;
            qty: import("@prisma/client/runtime/library").Decimal | null;
            unitWeight: import("@prisma/client/runtime/library").Decimal | null;
            totalWeight: import("@prisma/client/runtime/library").Decimal | null;
            measurementDate: Date | null;
            targetDate: Date | null;
            currentStage: import(".prisma/client").$Enums.WorkflowStage;
            invoiceAmountSar: import("@prisma/client/runtime/library").Decimal | null;
            technicalDetails: import("@prisma/client/runtime/library").JsonValue | null;
            coordDesignRequestedAt: Date | null;
            coordEngineeringSubmittedAt: Date | null;
            coordApprovalStatus: string | null;
            coordDescription: string | null;
        }[];
    } & {
        year: number | null;
        month: number | null;
        area: string | null;
        client: string | null;
        plant: string | null;
        poNumber: string | null;
        bidNumber: string | null;
        projectId: string;
        projectName: string | null;
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdById: string | null;
    }>;
    create(userId: string | undefined, data: {
        projectName?: string;
        year?: number;
        month?: number;
        area?: string;
        client?: string;
        plant?: string;
        poNumber?: string;
        projectId?: string;
        bidNumber?: string;
    }): import(".prisma/client").Prisma.Prisma__ProjectClient<{
        year: number | null;
        month: number | null;
        area: string | null;
        client: string | null;
        plant: string | null;
        poNumber: string | null;
        bidNumber: string | null;
        projectId: string;
        projectName: string | null;
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdById: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    private generateProjectId;
    update(id: string, data: {
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
    }): Promise<{
        year: number | null;
        month: number | null;
        area: string | null;
        client: string | null;
        plant: string | null;
        poNumber: string | null;
        bidNumber: string | null;
        projectId: string;
        projectName: string | null;
        id: string;
        updatedAt: Date;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ProjectStatus;
        createdById: string | null;
    }>;
    private ensure;
}

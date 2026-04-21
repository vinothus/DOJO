import type { JwtPayload } from '../common/types/jwt-payload';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private readonly projects;
    constructor(projects: ProjectsService);
    dashboard(user: JwtPayload): Promise<{
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
    linesByProject(user: JwtPayload): Promise<{
        rows: {
            projectId: string;
            label: string;
            lineCount: number;
        }[];
    }>;
    list(user: JwtPayload, includeArchived?: string): never[] | import(".prisma/client").Prisma.PrismaPromise<({
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
    get(id: string, user: JwtPayload): Promise<{
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
    create(user: JwtPayload, dto: CreateProjectDto): import(".prisma/client").Prisma.Prisma__ProjectClient<{
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
    update(id: string, dto: UpdateProjectDto): Promise<{
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
}

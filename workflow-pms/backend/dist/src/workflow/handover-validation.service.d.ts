import { Attachment, BomLine, LineItem, ManHourEntry, Project, TravelEntry, WorkflowStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceSettingsService } from '../settings/workspace-settings.service';
export declare class HandoverValidationService {
    private readonly prisma;
    private readonly workspaceSettings;
    constructor(prisma: PrismaService, workspaceSettings: WorkspaceSettingsService);
    getHandoverGate(lineItemId: string): Promise<{
        ready: boolean;
        nextStage: WorkflowStage | null;
        errors: string[];
        currentStage?: undefined;
    } | {
        ready: boolean;
        nextStage: null;
        errors: string[];
        currentStage: import(".prisma/client").$Enums.WorkflowStage;
    } | {
        ready: boolean;
        nextStage: import(".prisma/client").$Enums.WorkflowStage;
        errors: string[];
        currentStage: import(".prisma/client").$Enums.WorkflowStage;
    }>;
    validateExitFromCurrentStage(line: LineItem & {
        project: Project;
        manHours: ManHourEntry[];
        travelRows: TravelEntry[];
        bomLines: BomLine[];
        attachments: Attachment[];
    }): Promise<{
        ok: boolean;
        errors: string[];
    }>;
    private resolveHandoverContext;
    private validateExitFromStage;
    private requireProjectHeader;
    private requireCoordinationFields;
    private requireSiteMeasurementHeader;
    private requireBillOfMaterials;
    private requireMinAttachments;
    private requireManHoursForStage;
    private requireTravelForStage;
    private hasManHourQuantity;
    private nonEmpty;
    private positiveQty;
}

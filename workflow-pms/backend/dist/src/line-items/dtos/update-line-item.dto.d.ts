import { WorkflowStage } from '@prisma/client';
export declare class UpdateLineItemDto {
    inputDrawingNumber?: string;
    drawingNumber?: string;
    sheetNo?: string;
    revNo?: string;
    clampType?: string;
    material?: string;
    description?: string;
    qty?: number;
    unitWeight?: number;
    totalWeight?: number;
    measurementDate?: string;
    targetDate?: string;
    currentStage?: WorkflowStage;
    invoiceAmountSar?: number;
    technicalDetails?: Record<string, unknown>;
    coordDesignRequestedAt?: string;
    coordEngineeringSubmittedAt?: string;
    coordApprovalStatus?: string;
    coordDescription?: string;
    version: number;
}

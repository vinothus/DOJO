import { WorkflowStage } from '@prisma/client';
export declare class CreateLineItemDto {
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
    currentStage: WorkflowStage;
}

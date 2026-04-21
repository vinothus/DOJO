import { WorkflowStage } from '@prisma/client';
export declare class CreateManHourDto {
    stage: WorkflowStage;
    year?: number;
    month?: number;
    shift?: string;
    workDate?: string;
    idNumber?: string;
    category?: string;
    employeeName?: string;
    normalHours?: number;
    otHours?: number;
    totalHours?: number;
    jobStatus?: string;
    approvalStatus?: string;
    jobDescription?: string;
    rework?: string;
}
export declare class UpdateManHourDto extends CreateManHourDto {
    version: number;
}

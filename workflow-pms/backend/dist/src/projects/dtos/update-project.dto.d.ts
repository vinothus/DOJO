import { ProjectStatus } from '@prisma/client';
export declare class UpdateProjectDto {
    year?: number;
    month?: number;
    area?: string;
    projectName?: string;
    client?: string;
    plant?: string;
    poNumber?: string;
    projectId?: string;
    bidNumber?: string;
    status?: ProjectStatus;
}

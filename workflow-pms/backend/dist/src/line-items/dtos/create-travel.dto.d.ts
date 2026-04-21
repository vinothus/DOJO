import { TripMode, WorkflowStage } from '@prisma/client';
export declare class CreateTravelDto {
    stage: WorkflowStage;
    shift?: string;
    workDate?: string;
    tripLabel?: string;
    vehicleType?: string;
    tripMode?: TripMode;
    travelHours?: number;
    oneWayKm?: number;
    roundTripKm?: number;
    jobStatus?: string;
}

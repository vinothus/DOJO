import { ManHourEntry, TravelEntry, WorkflowStage } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
export declare function num(d: Decimal | number | null | undefined): number;
export declare function manHourQuantity(m: ManHourEntry): number;
export declare function travelKm(t: TravelEntry): number;
export declare class CostingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private static readonly DEFAULT_HOURLY;
    private static readonly DEFAULT_FUEL_KM;
    getDefaultHourlyRate(): Promise<number>;
    getDefaultFuelPerKm(): Promise<number>;
    sumHoursForStages(entries: ManHourEntry[], stages: WorkflowStage[]): number;
    sumFabByKeywords(entries: ManHourEntry[], keywords: string[]): number;
    sumMachiningByKeywords(entries: ManHourEntry[], keyword: string): number;
    sumTravelKm(rows: TravelEntry[], stages: WorkflowStage[]): number;
    sumYardShopTransportManHrs(entries: ManHourEntry[]): number;
}

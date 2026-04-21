import { Injectable } from '@nestjs/common';
import { ManHourEntry, TravelEntry, WorkflowStage } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

/** Normalizes Prisma Decimal | null to number */
export function num(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === 'number') return d;
  return Number(d);
}

/** Hours for a man-hour row: totalHours, or normal + OT */
export function manHourQuantity(m: ManHourEntry): number {
  if (m.totalHours != null) return num(m.totalHours);
  return num(m.normalHours) + num(m.otHours);
}

/** Trip KM: prefer round trip, else double one-way */
export function travelKm(t: TravelEntry): number {
  if (t.roundTripKm != null && num(t.roundTripKm) > 0) return num(t.roundTripKm);
  return num(t.oneWayKm) * 2;
}

@Injectable()
export class CostingService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly DEFAULT_HOURLY = 50;
  private static readonly DEFAULT_FUEL_KM = 0.35;

  async getDefaultHourlyRate(): Promise<number> {
    const rc = await this.prisma.rateCard.findFirst({
      where: { hourlyRate: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return rc?.hourlyRate != null ? num(rc.hourlyRate) : CostingService.DEFAULT_HOURLY;
  }

  async getDefaultFuelPerKm(): Promise<number> {
    const rc = await this.prisma.rateCard.findFirst({
      where: { fuelPerKm: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    return rc?.fuelPerKm != null ? num(rc.fuelPerKm) : CostingService.DEFAULT_FUEL_KM;
  }

  sumHoursForStages(entries: ManHourEntry[], stages: WorkflowStage[]): number {
    const set = new Set(stages);
    return entries
      .filter((e) => set.has(e.stage))
      .reduce((s, e) => s + manHourQuantity(e), 0);
  }

  sumFabByKeywords(
    entries: ManHourEntry[],
    keywords: string[],
  ): number {
    const lower = keywords.map((k) => k.toLowerCase());
    return entries
      .filter((e) => e.stage === WorkflowStage.FABRICATION_SHOP)
      .filter((e) => {
        const jd = (e.jobDescription ?? '').toLowerCase();
        return lower.some((k) => jd.includes(k));
      })
      .reduce((s, e) => s + manHourQuantity(e), 0);
  }

  sumMachiningByKeywords(entries: ManHourEntry[], keyword: string): number {
    const k = keyword.toLowerCase();
    return entries
      .filter((e) => e.stage === WorkflowStage.MACHINING_SHOP)
      .filter((e) => (e.jobDescription ?? '').toLowerCase().includes(k))
      .reduce((s, e) => s + manHourQuantity(e), 0);
  }

  sumTravelKm(rows: TravelEntry[], stages: WorkflowStage[]): number {
    const set = new Set(stages);
    return rows
      .filter((r) => set.has(r.stage))
      .reduce((s, r) => s + travelKm(r), 0);
  }

  /** Man-hours attributed to yard/shop transport within fab stage */
  sumYardShopTransportManHrs(entries: ManHourEntry[]): number {
    return entries
      .filter((e) => e.stage === WorkflowStage.FABRICATION_SHOP)
      .filter((e) =>
        /yard|transport|trip|shop/i.test(e.jobDescription ?? ''),
      )
      .reduce((s, e) => s + manHourQuantity(e), 0);
  }
}

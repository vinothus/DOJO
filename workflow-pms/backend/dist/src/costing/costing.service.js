"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CostingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostingService = void 0;
exports.num = num;
exports.manHourQuantity = manHourQuantity;
exports.travelKm = travelKm;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
function num(d) {
    if (d == null)
        return 0;
    if (typeof d === 'number')
        return d;
    return Number(d);
}
function manHourQuantity(m) {
    if (m.totalHours != null)
        return num(m.totalHours);
    return num(m.normalHours) + num(m.otHours);
}
function travelKm(t) {
    if (t.roundTripKm != null && num(t.roundTripKm) > 0)
        return num(t.roundTripKm);
    return num(t.oneWayKm) * 2;
}
let CostingService = CostingService_1 = class CostingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDefaultHourlyRate() {
        const rc = await this.prisma.rateCard.findFirst({
            where: { hourlyRate: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        return rc?.hourlyRate != null ? num(rc.hourlyRate) : CostingService_1.DEFAULT_HOURLY;
    }
    async getDefaultFuelPerKm() {
        const rc = await this.prisma.rateCard.findFirst({
            where: { fuelPerKm: { not: null } },
            orderBy: { createdAt: 'desc' },
        });
        return rc?.fuelPerKm != null ? num(rc.fuelPerKm) : CostingService_1.DEFAULT_FUEL_KM;
    }
    sumHoursForStages(entries, stages) {
        const set = new Set(stages);
        return entries
            .filter((e) => set.has(e.stage))
            .reduce((s, e) => s + manHourQuantity(e), 0);
    }
    sumFabByKeywords(entries, keywords) {
        const lower = keywords.map((k) => k.toLowerCase());
        return entries
            .filter((e) => e.stage === client_1.WorkflowStage.FABRICATION_SHOP)
            .filter((e) => {
            const jd = (e.jobDescription ?? '').toLowerCase();
            return lower.some((k) => jd.includes(k));
        })
            .reduce((s, e) => s + manHourQuantity(e), 0);
    }
    sumMachiningByKeywords(entries, keyword) {
        const k = keyword.toLowerCase();
        return entries
            .filter((e) => e.stage === client_1.WorkflowStage.MACHINING_SHOP)
            .filter((e) => (e.jobDescription ?? '').toLowerCase().includes(k))
            .reduce((s, e) => s + manHourQuantity(e), 0);
    }
    sumTravelKm(rows, stages) {
        const set = new Set(stages);
        return rows
            .filter((r) => set.has(r.stage))
            .reduce((s, r) => s + travelKm(r), 0);
    }
    sumYardShopTransportManHrs(entries) {
        return entries
            .filter((e) => e.stage === client_1.WorkflowStage.FABRICATION_SHOP)
            .filter((e) => /yard|transport|trip|shop/i.test(e.jobDescription ?? ''))
            .reduce((s, e) => s + manHourQuantity(e), 0);
    }
};
exports.CostingService = CostingService;
CostingService.DEFAULT_HOURLY = 50;
CostingService.DEFAULT_FUEL_KM = 0.35;
exports.CostingService = CostingService = CostingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CostingService);
//# sourceMappingURL=costing.service.js.map
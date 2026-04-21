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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list() {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: { roles: { include: { role: true } } },
        });
    }
    async create(data) {
        const exists = await this.prisma.user.findUnique({
            where: { email: data.email.toLowerCase().trim() },
        });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const roles = await this.prisma.role.findMany({
            where: { slug: { in: data.roleSlugs } },
        });
        if (roles.length !== data.roleSlugs.length) {
            throw new common_1.ConflictException('One or more roles are invalid');
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                email: data.email.toLowerCase().trim(),
                name: data.name,
                passwordHash,
                roles: {
                    create: roles.map((r) => ({ roleId: r.id })),
                },
            },
            include: { roles: { include: { role: true } } },
        });
    }
    async update(id, data) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 10)
            : undefined;
        if (data.roleSlugs) {
            const roles = await this.prisma.role.findMany({
                where: { slug: { in: data.roleSlugs } },
            });
            await this.prisma.userRole.deleteMany({ where: { userId: id } });
            await this.prisma.userRole.createMany({
                data: roles.map((r) => ({ userId: id, roleId: r.id })),
            });
        }
        return this.prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                isActive: data.isActive,
                ...(passwordHash ? { passwordHash } : {}),
            },
            include: { roles: { include: { role: true } } },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roles: { include: { role: true } } },
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    roleSlugs: string[];
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (exists) throw new ConflictException('Email already in use');

    const roles = await this.prisma.role.findMany({
      where: { slug: { in: data.roleSlugs } },
    });
    if (roles.length !== data.roleSlugs.length) {
      throw new ConflictException('One or more roles are invalid');
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

  async update(
    id: string,
    data: { name?: string; password?: string; isActive?: boolean; roleSlugs?: string[] },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

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
}

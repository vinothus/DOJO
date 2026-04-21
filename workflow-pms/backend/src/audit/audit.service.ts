import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    entityType: string,
    entityId: string,
    action: string,
    payload?: Record<string, unknown>,
    userId?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        payload: payload
          ? (payload as unknown as Prisma.InputJsonValue)
          : undefined,
        userId,
      },
    });
  }

  listForEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }
}

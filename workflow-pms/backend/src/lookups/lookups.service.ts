import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByCode(code: string) {
    const t = await this.prisma.lookupType.findUnique({
      where: { code },
      include: {
        values: { orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] },
      },
    });
    if (!t) throw new NotFoundException(`Lookup type '${code}' not found`);
    return t;
  }

  async addValue(code: string, value: string) {
    const t = await this.prisma.lookupType.findUnique({ where: { code } });
    if (!t) throw new NotFoundException(`Lookup type '${code}' not found`);
    return this.prisma.lookupValue.create({
      data: {
        lookupTypeId: t.id,
        value: value.trim(),
      },
    });
  }
}

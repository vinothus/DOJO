import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('project-status')
  projectStatus(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId query required');
    return this.reports.getProjectStatus(projectId);
  }

  @Get('portfolio-cost')
  portfolioCost(@CurrentUser() user: JwtPayload) {
    return this.reports.portfolioCostSummary(user.roles);
  }

  @Get('cost-summary')
  costSummary(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId query required');
    return this.reports.getCostSummary(projectId);
  }

  @Get('project-status.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="project-status.csv"')
  async projectStatusCsv(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId query required');
    const rows = await this.reports.getProjectStatus(projectId);
    if (!rows.length) return '';
    const keys = Object.keys(rows[0]);
    return this.reports.toCsv(keys, rows as unknown as Record<string, unknown>[]);
  }

  @Get('cost-summary.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cost-summary.csv"')
  async costSummaryCsv(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId query required');
    const rows = await this.reports.getCostSummary(projectId);
    if (!rows.length) return '';
    const keys = Object.keys(rows[0]);
    return this.reports.toCsv(keys, rows as unknown as Record<string, unknown>[]);
  }

  @Get('project-status.pdf')
  async projectStatusPdf(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId query required');
    const buf = await this.reports.generateProjectStatusPdf(projectId);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `attachment; filename=ProjectStatus_${projectId.slice(0, 8)}.pdf`,
    });
  }
}

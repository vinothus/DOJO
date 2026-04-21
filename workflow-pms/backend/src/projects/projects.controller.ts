import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { CreateProjectDto } from './dtos/create-project.dto';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** Aggregate counts for dashboard charts (before :id routes) */
  @Get('summary/dashboard')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.projects.dashboardSummary(user.roles);
  }

  @Get('summary/lines-by-project')
  linesByProject(@CurrentUser() user: JwtPayload) {
    return this.projects.linesByProjectTop(user.roles);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.projects.list(user.roles, includeArchived === 'true', user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projects.get(id, user.roles, user.sub);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'site_measurement')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'site_measurement')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projects.update(id, user.roles, user.sub, dto);
  }
}

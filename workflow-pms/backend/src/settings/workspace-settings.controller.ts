import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { WorkspaceSettingsService } from './workspace-settings.service';

@Controller('workspace-settings')
@UseGuards(JwtAuthGuard)
export class WorkspaceSettingsController {
  constructor(private readonly workspace: WorkspaceSettingsService) {}

  @Get()
  get() {
    return this.workspace.get();
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('admin')
  patch(@Body() body: Record<string, unknown>) {
    return this.workspace.patch(body);
  }
}

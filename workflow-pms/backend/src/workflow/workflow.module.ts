import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { WorkflowAccessService } from './workflow-access.service';
import { HandoverValidationService } from './handover-validation.service';

@Module({
  imports: [SettingsModule],
  providers: [WorkflowAccessService, HandoverValidationService],
  exports: [WorkflowAccessService, HandoverValidationService],
})
export class WorkflowModule {}

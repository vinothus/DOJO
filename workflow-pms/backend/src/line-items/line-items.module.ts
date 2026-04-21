import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { LineItemsController } from './line-items.controller';
import { LineItemsService } from './line-items.service';

@Module({
  imports: [WorkflowModule, AuditModule],
  controllers: [LineItemsController],
  providers: [LineItemsService],
  exports: [LineItemsService],
})
export class LineItemsModule {}

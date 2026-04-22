import { Module } from '@nestjs/common';
import { CostingModule } from '../costing/costing.module';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [CostingModule, ProjectsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

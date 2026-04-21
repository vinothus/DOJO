import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { LineItemsModule } from './line-items/line-items.module';
import { LookupsModule } from './lookups/lookups.module';
import { CostingModule } from './costing/costing.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 60 },
    ]),
    PrismaModule,
    SettingsModule,
    CostingModule,
    AuditModule,
    WorkflowModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    LineItemsModule,
    LookupsModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload';
import { CreateBomDto } from './dtos/create-bom.dto';
import { CreateLineItemDto } from './dtos/create-line-item.dto';
import { CreateManHourDto } from './dtos/man-hour.dto';
import { CreateTravelDto } from './dtos/create-travel.dto';
import { UpdateAttachmentDto } from './dtos/update-attachment.dto';
import { UploadAttachmentDto } from './dtos/upload-attachment.dto';
import { HandoverDto } from './dtos/handover.dto';
import { StageOverrideDto } from './dtos/stage-override.dto';
import { UpdateLineItemDto } from './dtos/update-line-item.dto';
import { LineItemsService } from './line-items.service';

const lineItemAttachmentStorage = diskStorage({
  destination: (req, file, cb) => {
    const root =
      process.env.FILE_STORAGE_PATH ?? join(process.cwd(), 'uploads');
    const dir = join(root, 'line-items');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const lineItemAttachmentUpload = {
  limits: { fileSize: 12 * 1024 * 1024 },
  storage: lineItemAttachmentStorage,
};

@Controller()
@UseGuards(JwtAuthGuard)
export class LineItemsController {
  constructor(private readonly lineItems: LineItemsService) {}

  @Get('projects/:projectId/line-items')
  listByProject(@Param('projectId') projectId: string) {
    return this.lineItems.listByProject(projectId);
  }

  @Post('projects/:projectId/line-items')
  @UseGuards(RolesGuard)
  @Roles('admin', 'site_measurement')
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLineItemDto,
  ) {
    return this.lineItems.create(
      projectId,
      {
        ...dto,
        measurementDate: dto.measurementDate
          ? new Date(dto.measurementDate)
          : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
      user.sub,
    );
  }

  @Get('line-items/:id')
  get(@Param('id') id: string) {
    return this.lineItems.get(id);
  }

  /** Prerequisite checklist before advancing to the next stage */
  @Get('line-items/:id/handover-gate')
  handoverGate(@Param('id') id: string) {
    return this.lineItems.getHandoverGate(id);
  }

  @Patch('line-items/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateLineItemDto,
  ) {
    return this.lineItems.update(
      id,
      user.roles,
      {
      inputDrawingNumber: dto.inputDrawingNumber,
      drawingNumber: dto.drawingNumber,
      sheetNo: dto.sheetNo,
      revNo: dto.revNo,
      clampType: dto.clampType,
      material: dto.material,
      description: dto.description,
      qty: dto.qty,
      unitWeight: dto.unitWeight,
      totalWeight: dto.totalWeight,
      measurementDate: dto.measurementDate
        ? new Date(dto.measurementDate)
        : undefined,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      currentStage: dto.currentStage,
      invoiceAmountSar: dto.invoiceAmountSar,
      technicalDetails: dto.technicalDetails,
      coordDesignRequestedAt: dto.coordDesignRequestedAt
        ? new Date(dto.coordDesignRequestedAt)
        : undefined,
      coordEngineeringSubmittedAt: dto.coordEngineeringSubmittedAt
        ? new Date(dto.coordEngineeringSubmittedAt)
        : undefined,
      coordApprovalStatus: dto.coordApprovalStatus,
      coordDescription: dto.coordDescription,
      version: dto.version,
      },
      user.sub,
    );
  }

  @Post('line-items/:id/handover')
  handover(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: HandoverDto,
  ) {
    return this.lineItems.handover(
      id,
      user.roles,
      user.sub,
      dto.targetStage,
      dto.note,
    );
  }

  @Post('line-items/:id/stage-override')
  stageOverride(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: StageOverrideDto,
  ) {
    return this.lineItems.stageOverride(
      id,
      user.roles,
      user.sub,
      dto.targetStage,
      dto.reason,
      dto.version,
    );
  }

  @Get('line-items/:id/audit')
  audit(@Param('id') id: string) {
    return this.lineItems.auditList(id);
  }

  @Post('line-items/:id/man-hours')
  addManHour(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateManHourDto,
  ) {
    return this.lineItems.addManHour(
      id,
      user.roles,
      {
        ...dto,
        workDate: dto.workDate ? new Date(dto.workDate) : undefined,
      },
      user.sub,
    );
  }

  @Delete('line-items/:lineId/man-hours/:entryId')
  removeManHour(
    @Param('lineId') lineId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lineItems.deleteManHour(lineId, entryId, user.roles, user.sub);
  }

  @Post('line-items/:id/travel')
  addTravel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTravelDto,
  ) {
    return this.lineItems.addTravel(
      id,
      user.roles,
      {
        ...dto,
        workDate: dto.workDate ? new Date(dto.workDate) : undefined,
      },
      user.sub,
    );
  }

  @Delete('line-items/:lineId/travel/:travelId')
  removeTravel(
    @Param('lineId') lineId: string,
    @Param('travelId') travelId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lineItems.deleteTravel(lineId, travelId, user.roles, user.sub);
  }

  @Post('line-items/:id/bom')
  addBom(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBomDto,
  ) {
    return this.lineItems.addBom(id, user.roles, dto, user.sub);
  }

  @Delete('line-items/:lineId/bom/:bomId')
  removeBom(
    @Param('lineId') lineId: string,
    @Param('bomId') bomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lineItems.deleteBom(lineId, bomId, user.roles, user.sub);
  }

  @Post('line-items/:id/attachments')
  @UseInterceptors(FileInterceptor('file', lineItemAttachmentUpload))
  async uploadAttachment(
    @Param('id') lineItemId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Body() body: UploadAttachmentDto,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file received. Ensure the request is multipart/form-data with field name "file".',
      );
    }
    return this.lineItems.createAttachment({
      lineItemId,
      stage: body.stage,
      filePath: file.path,
      fileName: file.originalname,
      mime: file.mimetype,
      sizeBytes: file.size,
      uploadedById: user.sub,
      roles: user.roles,
    });
  }

  @Get('line-items/:lineId/attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('lineId') lineId: string,
    @Param('attachmentId') attachmentId: string,
    @Query('inline') inline: string | undefined,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: false }) res: Response,
  ) {
    await this.lineItems.pipeAttachmentToResponse(
      res,
      lineId,
      attachmentId,
      user.sub,
      user.roles,
      { inline: inline === '1' || inline === 'true' },
    );
  }

  @Patch('line-items/:lineId/attachments/:attachmentId')
  @UseInterceptors(FileInterceptor('file', lineItemAttachmentUpload))
  updateAttachment(
    @Param('lineId') lineId: string,
    @Param('attachmentId') attachmentId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateAttachmentDto,
  ) {
    return this.lineItems.updateAttachment(
      lineId,
      attachmentId,
      user.sub,
      user.roles,
      {
        stage: body.stage,
        file: file
          ? {
              path: file.path,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : undefined,
      },
    );
  }

  @Delete('line-items/:lineId/attachments/:attachmentId')
  deleteAttachment(
    @Param('lineId') lineId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lineItems.deleteAttachment(
      lineId,
      attachmentId,
      user.sub,
      user.roles,
    );
  }
}

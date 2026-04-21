import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TripMode, WorkflowStage } from '@prisma/client';

export class CreateTravelDto {
  @IsEnum(WorkflowStage)
  stage!: WorkflowStage;

  @IsOptional() @IsString()
  shift?: string;

  @IsOptional() @IsDateString()
  workDate?: string;

  @IsOptional() @IsString()
  tripLabel?: string;

  @IsOptional() @IsString()
  vehicleType?: string;

  @IsOptional() @IsEnum(TripMode)
  tripMode?: TripMode;

  @IsOptional() @Type(() => Number) @IsNumber()
  travelHours?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  oneWayKm?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  roundTripKm?: number;

  @IsOptional() @IsString()
  jobStatus?: string;
}

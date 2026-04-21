import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBomDto {
  @IsOptional() @Type(() => Number) @IsInt()
  year?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  month?: number;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @Type(() => Number) @IsNumber()
  qty?: number;

  @IsOptional() @IsString()
  materialSpec?: string;
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddLookupValueDto } from './dtos/add-lookup-value.dto';
import { LookupsService } from './lookups.service';

@Controller('lookups')
@UseGuards(JwtAuthGuard)
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get(':code')
  list(@Param('code') code: string) {
    return this.lookups.listByCode(code);
  }

  @Post(':code')
  add(@Param('code') code: string, @Body() body: AddLookupValueDto) {
    return this.lookups.addValue(code, body.value);
  }
}


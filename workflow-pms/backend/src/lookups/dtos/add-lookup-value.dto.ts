import { IsString, MinLength } from 'class-validator';

export class AddLookupValueDto {
  @IsString()
  @MinLength(1)
  value!: string;
}

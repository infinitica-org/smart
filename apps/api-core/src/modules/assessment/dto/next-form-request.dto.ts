import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class NextFormRequestDto {
  @ApiProperty({ description: 'Level UUID to pull items from' })
  @IsUUID()
  levelId!: string;

  @ApiPropertyOptional({
    description: 'Form codes already used this session — excluded from selection',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeForms?: string[];
}

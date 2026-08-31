import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class NextFormRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'Level UUID to pull items from',
  })
  @IsUUID()
  levelId!: string;

  @ApiPropertyOptional({
    description: 'Form codes already used this session — excluded from selection',
    type: [String],
    items: { type: 'string' },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeForms?: string[];
}

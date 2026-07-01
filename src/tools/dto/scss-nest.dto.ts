import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScssNestDto {
    @ApiProperty({ example: '.card { color: red; }\n.card .title { font-weight: bold; }', maxLength: 500000 })
    @IsString()
    @MaxLength(500000)
    code: string;

    @ApiPropertyOptional({ description: 'Indent width in spaces (default 2).', example: 2 })
    @IsOptional()
    @IsInt()
    indent?: number;
}

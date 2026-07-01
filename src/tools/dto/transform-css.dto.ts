import { IsIn, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransformCssDto {
    @ApiProperty({ enum: ['css', 'scss'], example: 'scss' })
    @IsIn(['css', 'scss'])
    from: 'css' | 'scss';

    @ApiProperty({ enum: ['css', 'scss'], example: 'css' })
    @IsIn(['css', 'scss'])
    to: 'css' | 'scss';

    @ApiProperty({ example: '$c: red;\n.a { color: $c; }' })
    @IsString()
    @MaxLength(500000)
    code: string;

    @ApiPropertyOptional({ description: 'Compress the output.', example: false })
    @IsOptional()
    @IsBoolean()
    minify?: boolean;

    @ApiPropertyOptional({ description: 'Expand/pretty-print the output.', example: true })
    @IsOptional()
    @IsBoolean()
    expanded?: boolean;
}

import { IsIn, IsString, IsOptional, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MinifyDto {
    @ApiProperty({ enum: ['html', 'css', 'js'], example: 'js' })
    @IsIn(['html', 'css', 'js'])
    language: 'html' | 'css' | 'js';

    @ApiProperty({ example: 'const a = 1;\nconsole.log(a);' })
    @IsString()
    @MaxLength(500000)
    code: string;

    @ApiPropertyOptional({
        description: 'Per-tool boolean flags (e.g. { collapseWhitespace: true }).',
        example: { collapseWhitespace: true, removeComments: true },
    })
    @IsOptional()
    @IsObject()
    options?: Record<string, boolean>;
}

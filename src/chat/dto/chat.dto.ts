import { IsArray, IsString, IsOptional, ArrayNotEmpty } from 'class-validator';

export class UpdateChatSettingDto {
    @IsString()
    key: string;

    value: unknown;
}

export class UpdateGreetingsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    messages: string[];
}

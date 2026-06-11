import { IsArray, IsString, IsOptional, ArrayNotEmpty, Allow } from 'class-validator';

export class UpdateChatSettingDto {
    @IsString()
    key: string;

    @Allow()
    value: unknown;
}

export class UpdateGreetingsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    messages: string[];
}

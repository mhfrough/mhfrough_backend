import { IsString, IsEmail, IsOptional, IsInt, IsIn, Min, Max, Matches, IsNotEmpty } from 'class-validator';

export class CreateAppointmentDto {
    @IsString() @IsNotEmpty() title: string;
    @IsOptional() @IsString() clientName?: string;
    @IsOptional() @IsEmail() clientEmail?: string;
    @IsOptional() @IsString() clientPhone?: string;
    @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
    @IsString() @Matches(/^\d{2}:\d{2}$/) startTime: string;
    @IsOptional() @IsInt() @Min(15) @Max(480) durationMinutes?: number;
    @IsOptional() @IsString() notes?: string;
    @IsOptional() @IsIn(['pending', 'confirmed', 'cancelled', 'completed']) status?: string;
    @IsOptional() @IsString() leadId?: string;
}

export class UpdateAppointmentDto {
    @IsOptional() @IsString() @IsNotEmpty() title?: string;
    @IsOptional() @IsString() @IsNotEmpty() clientName?: string;
    @IsOptional() @IsEmail() clientEmail?: string;
    @IsOptional() @IsString() clientPhone?: string;
    @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
    @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) startTime?: string;
    @IsOptional() @IsInt() @Min(15) @Max(480) durationMinutes?: number;
    @IsOptional() @IsString() notes?: string;
    @IsOptional() @IsIn(['pending', 'confirmed', 'cancelled', 'completed']) status?: string;
}

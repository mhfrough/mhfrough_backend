import { IsArray, IsString, ArrayNotEmpty, MaxLength, MinLength } from 'class-validator';

export class WipeDataDto {
    /** Current admin password — re-verified before anything is deleted. */
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    password: string;

    /** Must exactly match the confirmation phrase shown in the UI. */
    @IsString()
    @MaxLength(50)
    confirm: string;

    /** Allowlisted dataset keys to clear (see AdminDataService.DATASETS). */
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @MaxLength(40, { each: true })
    datasets: string[];
}

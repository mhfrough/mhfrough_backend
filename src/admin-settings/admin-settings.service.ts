import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSettings } from './admin-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminSettingsService {
    constructor(
        @InjectRepository(AdminSettings) private readonly repo: Repository<AdminSettings>,
    ) { }

    async getSettings(): Promise<AdminSettings> {
        let settings = await this.repo.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = await this.repo.save(this.repo.create({ id: 1 }));
        }
        return settings;
    }

    async updateSettings(dto: UpdateSettingsDto): Promise<AdminSettings> {
        await this.getSettings(); // ensure row exists
        await this.repo.update(1, dto as Partial<AdminSettings>);
        return this.getSettings();
    }
}

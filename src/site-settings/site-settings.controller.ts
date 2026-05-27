import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSettings } from '../admin-settings/admin-settings.entity';
import { User } from '../users/user.entity';

/** Public endpoint — no auth required. Returns data needed to render the site footer. */
@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
    constructor(
        @InjectRepository(AdminSettings) private readonly settingsRepo: Repository<AdminSettings>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) { }

    @Get('footer')
    @ApiOperation({ summary: 'Public footer settings (social links + branding)' })
    async getFooter() {
        const [settings, user] = await Promise.all([
            this.settingsRepo.findOne({ where: { id: 1 } }),
            this.userRepo.findOne({ where: { role: 'admin' as any }, order: { createdAt: 'ASC' } }),
        ]);

        return {
            // Branding (from admin_settings)
            copyrightOwner: settings?.copyrightOwner ?? 'mhfrough.dev',
            footerTagline: settings?.footerTagline ?? 'Made with \u2665 in Karachi',
            showFooterTagline: settings?.showFooterTagline ?? true,

            // Profile (from user)
            displayName: user?.displayName ?? null,
            avatarUrl: user?.avatarUrl ?? null,
            aboutHtml: user?.aboutHtml ?? null,
            location: user?.location ?? null,

            // Social links (from user profile)
            contactEmail: user?.contactEmail ?? null,
            website: user?.website ?? null,
            github: user?.github ?? null,
            linkedin: user?.linkedin ?? null,
            twitter: user?.twitter ?? null,
            instagram: user?.instagram ?? null,
            youtube: user?.youtube ?? null,
            discord: user?.discord ?? null,
            stackoverflow: user?.stackoverflow ?? null,
            medium: user?.medium ?? null,
            dribbble: user?.dribbble ?? null,
            socialVisibility: user?.socialVisibility ?? null,
        };
    }
}

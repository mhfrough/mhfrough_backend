/**
 * Seeds the gallery_items table with dummy Unsplash images.
 * Run once (safe to re-run — skips if items already exist):
 *   npx ts-node src/seed-gallery.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { GalleryItem, MediaType } from './gallery/gallery-item.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mhfrough_db',
    entities: [GalleryItem],
    synchronize: true,
});

const BASE = 'https://images.unsplash.com/photo';

const items: Partial<GalleryItem>[] = [
    // ── Photography ──────────────────────────────────────────────────────────
    {
        title: 'Mountain Fog',
        caption: 'Early morning mist rolling through alpine peaks.',
        mediaUrl: `${BASE}-1501854140801-50d01698950b?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Photography',
        altText: 'Misty mountain range at dawn',
        mimeType: 'image/jpeg',
        sortOrder: 1,
        isPublished: true,
    },
    {
        title: 'Golden Hour',
        caption: 'The last light of day over a still lake.',
        mediaUrl: `${BASE}-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Photography',
        altText: 'Sunset reflection on a calm lake',
        mimeType: 'image/jpeg',
        sortOrder: 2,
        isPublished: true,
    },
    {
        title: 'Street Shadows',
        caption: 'Geometry and light in the urban landscape.',
        mediaUrl: `${BASE}-1542204165-65bf26472b9b?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Photography',
        altText: 'Black and white street photography with shadows',
        mimeType: 'image/jpeg',
        sortOrder: 3,
        isPublished: true,
    },
    {
        title: 'Rain on Glass',
        caption: 'A quiet moment — city lights distorted through a rain-covered window.',
        mediaUrl: `${BASE}-1519125323398-675f0ddb6308?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Photography',
        altText: 'Raindrops on a window with bokeh city lights',
        mimeType: 'image/jpeg',
        sortOrder: 4,
        isPublished: true,
    },
    // ── Architecture ─────────────────────────────────────────────────────────
    {
        title: 'Minimal Facade',
        caption: 'Clean lines and concrete — modernist residential architecture.',
        mediaUrl: `${BASE}-1526817575615-7685d97d5c5f?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Architecture',
        altText: 'Modern concrete building facade',
        mimeType: 'image/jpeg',
        sortOrder: 5,
        isPublished: true,
    },
    {
        title: 'Glass Tower',
        caption: 'Looking up at the steel and glass of a city skyscraper.',
        mediaUrl: `${BASE}-1486591978090-a8f35a73e9f4?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Architecture',
        altText: 'Glass skyscraper shot from below',
        mimeType: 'image/jpeg',
        sortOrder: 6,
        isPublished: true,
    },
    {
        title: 'Interior Light',
        caption: 'Natural light flooding a minimalist interior space.',
        mediaUrl: `${BASE}-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Architecture',
        altText: 'Bright minimalist interior with sunlight',
        mimeType: 'image/jpeg',
        sortOrder: 7,
        isPublished: true,
    },
    // ── Nature ────────────────────────────────────────────────────────────────
    {
        title: 'Ocean Tide',
        caption: 'The relentless rhythm of waves on a rocky shore.',
        mediaUrl: `${BASE}-1490682143684-3d3948b0c1e8?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Nature',
        altText: 'Ocean waves crashing on rocks',
        mimeType: 'image/jpeg',
        sortOrder: 8,
        isPublished: true,
    },
    {
        title: 'Ancient Forest',
        caption: 'Sunlight filtered through old-growth woodland.',
        mediaUrl: `${BASE}-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Nature',
        altText: 'Tall trees in a dense forest with sun rays',
        mimeType: 'image/jpeg',
        sortOrder: 9,
        isPublished: true,
    },
    {
        title: 'Desert Dunes',
        caption: 'Wind-sculpted sand dunes under a clear sky.',
        mediaUrl: `${BASE}-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Nature',
        altText: 'Rolling sand dunes in a desert landscape',
        mimeType: 'image/jpeg',
        sortOrder: 10,
        isPublished: true,
    },
    // ── Design ────────────────────────────────────────────────────────────────
    {
        title: 'Colour Study',
        caption: 'An exploration of warm and cool tonal relationships.',
        mediaUrl: `${BASE}-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Design',
        altText: 'Abstract colour palette swatch composition',
        mimeType: 'image/jpeg',
        sortOrder: 11,
        isPublished: true,
    },
    {
        title: 'Workspace',
        caption: 'Where ideas take shape — a designer\'s desk setup.',
        mediaUrl: `${BASE}-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Design',
        altText: 'Flatlay of a tech desk with keyboard and notebook',
        mimeType: 'image/jpeg',
        sortOrder: 12,
        isPublished: true,
    },
    {
        title: 'UI Prototype',
        caption: 'Early screen designs for a mobile application.',
        mediaUrl: `${BASE}-1531297484001-80022131f5a1?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Design',
        altText: 'Laptop screen showing UI design mockup',
        mimeType: 'image/jpeg',
        sortOrder: 13,
        isPublished: true,
    },
    // ── Travel ────────────────────────────────────────────────────────────────
    {
        title: 'City Lights',
        caption: 'A metropolitan skyline after dark.',
        mediaUrl: `${BASE}-1494548162494-384bba4ab999?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Travel',
        altText: 'City skyline illuminated at night',
        mimeType: 'image/jpeg',
        sortOrder: 14,
        isPublished: true,
    },
    {
        title: 'Cobblestone Alley',
        caption: 'Old-town streets untouched by time.',
        mediaUrl: `${BASE}-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=900&q=80`,
        mediaType: MediaType.IMAGE,
        category: 'Travel',
        altText: 'Narrow cobblestone lane in an old European city',
        mimeType: 'image/jpeg',
        sortOrder: 15,
        isPublished: true,
    },
];

async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(GalleryItem);

    const count = await repo.count();
    if (count > 0) {
        console.log(`Gallery already has ${count} item(s). Skipping seed.`);
        process.exit(0);
    }

    const created = repo.create(items);
    await repo.save(created);
    console.log(`✅ Seeded ${created.length} gallery items.`);
    process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });

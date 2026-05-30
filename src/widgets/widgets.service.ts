import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WidgetCache } from './widget-cache.entity';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';

// ── TTLs (ms) ────────────────────────────────────────────────────────────────
const WEATHER_TTL = 60 * 60 * 1000;         // 1 hour
const GOLD_TTL = 8 * 60 * 60 * 1000;     // 8 hours — 3 calls/day via GoldAPI
const USD_TTL = 30 * 60 * 1000;         // 30 minutes

// ── Normalised condition keys ─────────────────────────────────────────────────
function normaliseCondition(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('thunder')) return 'thunderstorm';
    if (t.includes('sleet') || t.includes('ice pellet')) return 'sleet';
    if (t.includes('snow') || t.includes('blizzard') || t.includes('ice')) return 'snow';
    if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) return 'rain';
    if (t.includes('fog') || t.includes('mist') || t.includes('haze')) return 'fog';
    if (t.includes('overcast') || t.includes('cloudy')) return 'cloudy';
    if (t.includes('partly')) return 'partly-cloudy';
    if (t.includes('sunny') || t.includes('clear')) return 'sunny';
    return 'cloudy';
}

@Injectable()
export class WidgetsService {
    private readonly logger = new Logger(WidgetsService.name);

    constructor(
        @InjectRepository(WidgetCache)
        private readonly cacheRepo: Repository<WidgetCache>,
        private readonly settingsService: AdminSettingsService,
    ) { }

    // ── Internal cache helpers ────────────────────────────────────────────────

    private async getCache(key: string): Promise<WidgetCache | null> {
        return this.cacheRepo.findOne({ where: { key } });
    }

    private async setCache(key: string, data: Record<string, unknown>): Promise<void> {
        await this.cacheRepo.upsert(
            { key, data: data as any, lastFetched: new Date() },
            ['key'],
        );
    }

    private isFresh(entry: WidgetCache | null, ttl: number): boolean {
        if (!entry?.lastFetched || !entry.data) return false;
        return Date.now() - new Date(entry.lastFetched).getTime() < ttl;
    }

    // ── Weather ───────────────────────────────────────────────────────────────

    async getWeather(): Promise<Record<string, unknown>> {
        const CACHE_KEY = 'weather';
        const cached = await this.getCache(CACHE_KEY);
        if (this.isFresh(cached, WEATHER_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const apiKey = settings.weatherApiKey;
        const city = settings.weatherCity || 'Karachi';

        if (!apiKey) {
            this.logger.warn('Weather API key not configured — returning cached/fallback');
            return cached?.data ?? { error: 'not_configured' };
        }

        try {
            const url = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(city)}&aqi=no`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`WeatherAPI HTTP ${res.status}`);
            const raw = await res.json() as Record<string, unknown>;
            const cur = raw['current'] as Record<string, unknown>;
            const cond = cur['condition'] as Record<string, unknown>;

            const data: Record<string, unknown> = {
                temp: Math.round(cur['temp_c'] as number),
                condition: normaliseCondition((cond['text'] as string) ?? ''),
                conditionText: cond['text'] as string,
                location: city,
                humidity: cur['humidity'] as number,
                windKph: cur['wind_kph'] as number,
            };
            await this.setCache(CACHE_KEY, data);
            return data;
        } catch (err) {
            this.logger.error('WeatherAPI fetch failed', err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── Gold ──────────────────────────────────────────────────────────────────

    async getGold(): Promise<Record<string, unknown>> {
        const CACHE_KEY = 'gold';
        const cached = await this.getCache(CACHE_KEY);
        if (this.isFresh(cached, GOLD_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const apiKey = settings.goldApiKey;

        if (!apiKey) {
            this.logger.warn('Gold API key not configured — returning cached/fallback');
            return cached?.data ?? { error: 'not_configured' };
        }

        try {
            // GoldAPI.io — returns spot price in USD per troy oz
            const goldRes = await fetch('https://www.goldapi.io/api/XAU/USD', {
                headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' },
            });
            if (!goldRes.ok) throw new Error(`GoldAPI HTTP ${goldRes.status}`);
            const goldRaw = await goldRes.json() as Record<string, unknown>;
            const priceUsd = goldRaw['price'] as number;
            if (!priceUsd) throw new Error('GoldAPI: missing price field');

            // Get USD/PKR rate from cache (prefer fresh, fall back to DB cache)
            const usdCache = await this.getCache('usd_pkr');
            const usdPkrRate: number = (usdCache?.data?.['rate'] as number | undefined) ?? 280;

            // 1 troy oz = 31.1035 g · 1 tola = 11.6638 g
            const pricePerTola = Math.round((priceUsd / 31.1035) * 11.6638 * usdPkrRate);

            const data: Record<string, unknown> = { pricePerTola, currency: 'PKR' };
            await this.setCache(CACHE_KEY, data);
            return data;
        } catch (err) {
            this.logger.error('Gold API fetch failed', err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── USD/PKR ───────────────────────────────────────────────────────────────

    async getUsdPkr(): Promise<Record<string, unknown>> {
        const CACHE_KEY = 'usd_pkr';
        const cached = await this.getCache(CACHE_KEY);
        if (this.isFresh(cached, USD_TTL)) return cached!.data!;

        const settings = await this.settingsService.getSettings();
        const apiKey = settings.currencyApiKey;

        if (!apiKey) {
            this.logger.warn('Currency API key not configured — returning cached/fallback');
            return cached?.data ?? { error: 'not_configured' };
        }

        try {
            const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/pair/USD/PKR`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`ExchangeRate-API HTTP ${res.status}`);
            const raw = await res.json() as Record<string, unknown>;

            if (raw['result'] !== 'success') {
                throw new Error('ExchangeRate-API returned non-success result');
            }

            const data: Record<string, unknown> = {
                rate: Math.round((raw['conversion_rate'] as number) * 100) / 100,
                pair: 'USD/PKR',
            };
            await this.setCache(CACHE_KEY, data);
            return data;
        } catch (err) {
            this.logger.error('Currency API fetch failed', err);
            return cached?.data ?? { error: 'fetch_failed' };
        }
    }

    // ── Admin: widget key config status (masked) ──────────────────────────────

    async getWidgetConfig(): Promise<Record<string, unknown>> {
        const settings = await this.settingsService.getSettings();
        return {
            weatherConfigured: !!settings.weatherApiKey,
            goldConfigured: !!settings.goldApiKey,
            currencyConfigured: !!settings.currencyApiKey,
            weatherCity: settings.weatherCity,
        };
    }
}

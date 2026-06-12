import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WidgetCache } from './widget-cache.entity';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';

// ── TTLs (ms) ────────────────────────────────────────────────────────────────
// Keep cache TTLs in milliseconds here — controls how often external APIs are
// called and when cached widget data is considered stale.
const WEATHER_TTL = 15 * 60 * 1000;         // 15 minutes
const GOLD_TTL = 8 * 60 * 60 * 1000;        // 8 hours — ~3 calls/day via GoldAPI
const USD_TTL = 60 * 60 * 1000;             // 1 hour — keeps ExchangeRate-API well under 1500/mo free tier

// ── WeatherAPI condition code → icon key ──────────────────────────────────────
type WeatherIcon = 'sunny' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunderstorm';

function getWeatherIcon(code: number): WeatherIcon {
    if ([1000].includes(code)) return 'sunny';

    // True fog/whiteout only — "Mist" (1030) is reported constantly in humid
    // coastal cities like Karachi but reads as haze, not fog, so it falls
    // through to 'cloudy' below instead of dominating the fog icon.
    if ([1135, 1147].includes(code)) return 'fog';

    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'thunderstorm';

    if ([1066, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225,
        1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return 'snow';

    if ([1063, 1069, 1072, 1150, 1153, 1168, 1171,
        1180, 1183, 1186, 1189, 1192, 1195,
        1198, 1201, 1240, 1243, 1246].includes(code)) return 'rain';

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
                condition: getWeatherIcon(cond['code'] as number),
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

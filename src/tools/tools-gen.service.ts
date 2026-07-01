import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as postcss from 'postcss';
import * as cheerio from 'cheerio';
import chroma from 'chroma-js';
import { ToolUsageLog } from './tool-usage.entity';
import { QrDto } from './dto/qr.dto';
import { BarcodeDto } from './dto/barcode.dto';
import { JwtEncodeDto } from './dto/jwt-encode.dto';
import { PasswordHashDto } from './dto/password-hash.dto';
import { ScssNestDto } from './dto/scss-nest.dto';
import { PaletteDto } from './dto/palette.dto';

@Injectable()
export class ToolsGenService {
    private readonly logger = new Logger(ToolsGenService.name);

    constructor(
        @InjectRepository(ToolUsageLog)
        private readonly repo: Repository<ToolUsageLog>,
    ) { }

    // ── Generators / codecs ───────────────────────────────────────────────────

    async qr(dto: QrDto, ip: string, ua: string) {
        const start = Date.now();
        try {
            const dark = dto.dark || '#000000';
            const light = dto.light || '#ffffff';
            const ecLevel = dto.ecLevel || 'M';

            let output: string;
            let format: 'png' | 'svg';

            if (dto.format === 'svg') {
                output = await QRCode.toString(dto.text, {
                    type: 'svg',
                    margin: dto.margin,
                    width: dto.size,
                    color: { dark, light },
                    errorCorrectionLevel: ecLevel,
                });
                format = 'svg';
            } else {
                output = await QRCode.toDataURL(dto.text, {
                    margin: dto.margin ?? 2,
                    width: dto.size ?? 256,
                    color: { dark, light },
                    errorCorrectionLevel: ecLevel,
                });
                format = 'png';
            }

            this.record({
                toolId: 'qr-barcode',
                action: 'qr',
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { output, format };
        } catch (err) {
            throw this.fail('qr-barcode', 'qr', err, start, ip, ua);
        }
    }

    async barcode(dto: BarcodeDto, ip: string, ua: string) {
        const start = Date.now();
        try {
            const png = await bwipjs.toBuffer({
                bcid: dto.type || 'code128',
                text: dto.text,
                scale: dto.scale || 3,
                height: dto.height || 10,
                includetext: dto.includetext !== false,
                textxalign: 'center',
            });
            const output = `data:image/png;base64,${png.toString('base64')}`;

            this.record({
                toolId: 'qr-barcode',
                action: 'barcode',
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { output, format: 'png' as const };
        } catch (err) {
            // bwip-js throws plain strings / Errors for an unknown bcid or invalid text.
            throw this.fail('qr-barcode', 'barcode', err, start, ip, ua);
        }
    }

    async jwtEncode(dto: JwtEncodeDto, ip: string, ua: string) {
        const start = Date.now();
        try {
            const options: jwt.SignOptions = {
                algorithm: (dto.algorithm || 'HS256') as jwt.Algorithm,
                ...(dto.expiresIn ? { expiresIn: dto.expiresIn as jwt.SignOptions['expiresIn'] } : {}),
            };
            const token = jwt.sign(dto.payload, dto.secret, options);

            this.record({
                toolId: 'jwt-codec',
                action: 'encode',
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { token };
        } catch (err) {
            throw this.fail('jwt-codec', 'encode', err, start, ip, ua);
        }
    }

    async passwordHash(dto: PasswordHashDto, ip: string, ua: string) {
        const start = Date.now();
        const algorithm = dto.algorithm;
        try {
            let hash: string;
            if (algorithm === 'bcrypt') {
                hash = await bcrypt.hash(dto.password, dto.rounds || 10);
            } else {
                hash = crypto.createHash(algorithm).update(dto.password).digest('hex');
            }

            this.record({
                toolId: 'password-gen',
                action: `hash-${algorithm}`,
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { hash, algorithm };
        } catch (err) {
            throw this.fail('password-gen', `hash-${algorithm}`, err, start, ip, ua);
        }
    }

    /**
     * Convert flat CSS into nested SCSS — best-effort.
     *
     * Approach: parse with PostCSS, then build a selector tree from descendant
     * selectors. Each top-level rule's selector is split on its descendant
     * combinators (whitespace that is NOT inside () or []). Segments are nested
     * under one another; a segment that begins with a combinator (>, +, ~) or a
     * pseudo/compound marker (&, :, ::) is prefixed with `&` so the SCSS keeps
     * the relationship (e.g. `&:hover`, `& > .x`). Declarations are attached to
     * the deepest segment.
     *
     * Limitations (documented intentionally):
     *  - Multi-selector rules (comma lists) and @-rules (@media, @keyframes,
     *    @supports, …) are emitted flat at the top level, not merged/nested.
     *  - No de-duplication: two input rules that share an ancestor produce two
     *    separate nested blocks rather than being merged under one parent.
     *  - Combinator/pseudo handling is heuristic and may not cover every exotic
     *    selector; output is still valid SCSS that compiles back to the input.
     */
    async scssNest(dto: ScssNestDto, ip: string, ua: string) {
        const start = Date.now();
        const indent = dto.indent ?? 2;
        try {
            const root = postcss.parse(dto.code);
            const pad = (depth: number) => ' '.repeat(indent * depth);
            const lines: string[] = [];

            const renderDecls = (rule: postcss.Rule, depth: number) => {
                rule.each((node) => {
                    if (node.type === 'decl') {
                        lines.push(`${pad(depth)}${node.prop}: ${node.value};`);
                    } else if (node.type === 'comment') {
                        lines.push(`${pad(depth)}/* ${node.text} */`);
                    }
                });
            };

            const renderRule = (rule: postcss.Rule, depth: number) => {
                const selectors = this.splitSelectorList(rule.selector);

                // Multi-selector rules stay flat (joined with commas).
                if (selectors.length > 1) {
                    lines.push(`${pad(depth)}${selectors.join(', ')} {`);
                    renderDecls(rule, depth + 1);
                    lines.push(`${pad(depth)}}`);
                    return;
                }

                const segments = this.splitDescendant(selectors[0] ?? '');
                if (segments.length <= 1) {
                    lines.push(`${pad(depth)}${segments[0] ?? selectors[0] ?? ''} {`);
                    renderDecls(rule, depth + 1);
                    lines.push(`${pad(depth)}}`);
                    return;
                }

                // Open one nested block per descendant segment.
                let d = depth;
                segments.forEach((seg, i) => {
                    const head = i === 0 ? seg : this.nestSegment(seg);
                    lines.push(`${pad(d)}${head} {`);
                    d += 1;
                });
                renderDecls(rule, d);
                // Close them in reverse.
                for (let i = segments.length - 1; i >= 0; i--) {
                    d -= 1;
                    lines.push(`${pad(d)}}`);
                }
            };

            // Emit an at-rule (and any nested rules) flat — best-effort passthrough.
            const renderAtRule = (at: postcss.AtRule, depth: number) => {
                const header = `@${at.name}${at.params ? ' ' + at.params : ''}`;
                if (at.nodes === undefined) {
                    lines.push(`${pad(depth)}${header};`);
                    return;
                }
                lines.push(`${pad(depth)}${header} {`);
                at.each((node) => {
                    if (node.type === 'rule') {
                        renderRule(node, depth + 1);
                    } else if (node.type === 'atrule') {
                        renderAtRule(node, depth + 1);
                    } else if (node.type === 'decl') {
                        lines.push(`${pad(depth + 1)}${node.prop}: ${node.value};`);
                    } else if (node.type === 'comment') {
                        lines.push(`${pad(depth + 1)}/* ${node.text} */`);
                    }
                });
                lines.push(`${pad(depth)}}`);
            };

            root.each((node) => {
                if (node.type === 'rule') {
                    renderRule(node, 0);
                } else if (node.type === 'atrule') {
                    renderAtRule(node, 0);
                } else if (node.type === 'comment') {
                    lines.push(`/* ${node.text} */`);
                }
            });

            const output = lines.join('\n');
            const durationMs = Date.now() - start;

            this.record({
                toolId: 'scss-nesting',
                action: 'nest',
                status: 'success',
                bytesIn: Buffer.byteLength(dto.code, 'utf8'),
                bytesOut: Buffer.byteLength(output, 'utf8'),
                durationMs,
                ip,
                userAgent: ua,
            });

            return { output, durationMs };
        } catch (err) {
            throw this.fail('scss-nesting', 'nest', err, start, ip, ua);
        }
    }

    async palette(dto: PaletteDto, ip: string, ua: string) {
        const start = Date.now();
        try {
            let base: chroma.Color;
            try {
                base = chroma(dto.base);
            } catch {
                throw new Error(`Invalid base colour: ${dto.base}`);
            }
            const count = dto.count && dto.count > 0 ? dto.count : 6;
            const baseHue = isNaN(base.get('hsl.h')) ? 0 : base.get('hsl.h');

            const rotate = (deg: number) => base.set('hsl.h', (baseHue + deg + 360) % 360).hex();
            const cycle = (offsets: number[]): string[] => {
                const out: string[] = [];
                for (let i = 0; i < count; i++) {
                    out.push(rotate(offsets[i % offsets.length]));
                }
                return out;
            };

            let colors: string[];
            switch (dto.scheme) {
                case 'analogous':
                    colors = this.spread([-30, 0, 30].map(rotate), count);
                    break;
                case 'complementary':
                    colors = this.spread([base.hex(), rotate(180)], count);
                    break;
                case 'triadic':
                    colors = this.spread([base.hex(), rotate(120), rotate(240)], count);
                    break;
                case 'tetradic':
                    colors = this.spread([base.hex(), rotate(90), rotate(180), rotate(270)], count);
                    break;
                case 'monochromatic':
                    colors = chroma
                        .scale([base.brighten(2), base, base.darken(2)])
                        .mode('lab')
                        .colors(count);
                    break;
                case 'shades':
                    colors = chroma.scale([base, 'black']).mode('lab').colors(count);
                    break;
                case 'tints':
                    colors = chroma.scale([base, 'white']).mode('lab').colors(count);
                    break;
                default:
                    colors = cycle([0]);
            }

            this.record({
                toolId: 'palette-generator',
                action: dto.scheme,
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { colors };
        } catch (err) {
            throw this.fail('palette-generator', dto.scheme, err, start, ip, ua);
        }
    }

    // ── Web extractors ────────────────────────────────────────────────────────

    async extract(url: string, ip: string, ua: string) {
        const start = Date.now();
        this.assertSafeUrl(url);
        try {
            const html = await this.fetchHtml(url);
            const $ = cheerio.load(html);

            // Gather raw CSS text from <style> blocks plus every inline style="".
            const cssChunks: string[] = [];
            $('style').each((_i, el) => { cssChunks.push($(el).text()); });
            $('[style]').each((_i, el) => {
                const s = $(el).attr('style');
                if (s) cssChunks.push(s);
            });
            const cssText = cssChunks.join('\n');

            // Colours: hex + rgb()/rgba().
            const colorRe = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
            const colors = this.dedupe(
                (cssText.match(colorRe) ?? []).map((c) => c.trim().toLowerCase()),
            ).slice(0, 14);

            // Fonts: font-family declarations.
            const fontRe = /font-family\s*:\s*([^;{}]+)/gi;
            const fontValues: string[] = [];
            let m: RegExpExecArray | null;
            while ((m = fontRe.exec(cssText)) !== null) {
                m[1]
                    .split(',')
                    .map((f) => f.trim().replace(/^["']|["']$/g, ''))
                    .filter(Boolean)
                    .forEach((f) => fontValues.push(f));
            }
            const fonts = this.dedupe(fontValues).slice(0, 10);

            const faviconHref = $('link[rel*="icon"]').first().attr('href') || '';
            const meta = {
                title: $('title').first().text().trim(),
                description: ($('meta[name="description"]').attr('content') || '').trim(),
                favicon: faviconHref ? this.resolveUrl(faviconHref, url) : '',
            };

            this.record({
                toolId: 'design-extractor',
                action: 'extract',
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return { colors, fonts, meta };
        } catch (err) {
            throw this.fail('design-extractor', 'extract', err, start, ip, ua);
        }
    }

    async seo(url: string, ip: string, ua: string) {
        const start = Date.now();
        this.assertSafeUrl(url);
        try {
            const html = await this.fetchHtml(url);
            const $ = cheerio.load(html);

            const title = $('title').first().text().trim();
            const description = ($('meta[name="description"]').attr('content') || '').trim();
            const canonical = $('link[rel="canonical"]').attr('href') || '';
            const robots = ($('meta[name="robots"]').attr('content') || '').trim();

            const og: Record<string, string> = {};
            $('meta[property^="og:"]').each((_i, el) => {
                const prop = $(el).attr('property');
                const content = $(el).attr('content');
                if (prop && content !== undefined) og[prop] = content;
            });

            const twitter: Record<string, string> = {};
            $('meta[name^="twitter:"]').each((_i, el) => {
                const name = $(el).attr('name');
                const content = $(el).attr('content');
                if (name && content !== undefined) twitter[name] = content;
            });

            const h1: string[] = [];
            $('h1').each((_i, el) => { h1.push($(el).text().trim()); });

            const headings: { level: number; text: string }[] = [];
            for (let lvl = 1; lvl <= 6; lvl++) {
                $(`h${lvl}`).each((_i, el) => {
                    headings.push({ level: lvl, text: $(el).text().trim() });
                });
            }

            const totalImages = $('img').length;
            let missingAlt = 0;
            $('img').each((_i, el) => {
                const alt = $(el).attr('alt');
                if (alt === undefined || alt.trim() === '') missingAlt += 1;
            });

            const issues: { level: 'good' | 'warn' | 'error'; msg: string }[] = [];

            // Title
            if (!title) {
                issues.push({ level: 'error', msg: 'Missing <title>.' });
            } else if (title.length >= 30 && title.length <= 60) {
                issues.push({ level: 'good', msg: `Title length is ${title.length} characters.` });
            } else {
                issues.push({
                    level: 'warn',
                    msg: `Title length is ${title.length} characters (aim for 30-60).`,
                });
            }

            // Description
            if (!description) {
                issues.push({ level: 'error', msg: 'Missing meta description.' });
            } else if (description.length >= 50 && description.length <= 160) {
                issues.push({ level: 'good', msg: `Description length is ${description.length} characters.` });
            } else {
                issues.push({
                    level: 'warn',
                    msg: `Description length is ${description.length} characters (aim for 50-160).`,
                });
            }

            // H1
            if (h1.length === 1) {
                issues.push({ level: 'good', msg: 'Exactly one <h1> found.' });
            } else if (h1.length === 0) {
                issues.push({ level: 'warn', msg: 'No <h1> found.' });
            } else {
                issues.push({ level: 'warn', msg: `${h1.length} <h1> tags found (expected 1).` });
            }

            // Canonical
            if (canonical) {
                issues.push({ level: 'good', msg: 'Canonical link present.' });
            } else {
                issues.push({ level: 'warn', msg: 'No canonical link.' });
            }

            // Images
            if (missingAlt > 0) {
                issues.push({ level: 'warn', msg: `${missingAlt} image(s) missing alt text.` });
            }

            this.record({
                toolId: 'seo-tools',
                action: 'audit',
                status: 'success',
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
            });

            return {
                url,
                title,
                titleLength: title.length,
                description,
                descriptionLength: description.length,
                canonical,
                robots,
                og,
                twitter,
                h1,
                headings,
                images: { total: totalImages, missingAlt },
                issues,
            };
        } catch (err) {
            throw this.fail('seo-tools', 'audit', err, start, ip, ua);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * SSRF guard. Only http(s) and only public hostnames are allowed; loopback,
     * link-local and RFC1918 private ranges are rejected before any fetch.
     */
    private assertSafeUrl(url: string): void {
        let u: URL;
        try {
            u = new URL(url);
        } catch {
            throw new BadRequestException('Invalid URL.');
        }
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            throw new BadRequestException('Only http and https URLs are allowed.');
        }
        const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
        const blocked =
            host === 'localhost' ||
            host === '::1' ||
            host.startsWith('127.') ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host.startsWith('169.254.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);
        if (blocked) {
            throw new BadRequestException('Refusing to fetch a private or loopback address.');
        }
    }

    /** Fetch a URL as text with a browser-like UA and an 8s timeout. */
    private async fetchHtml(url: string): Promise<string> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml',
                },
            });
            if (!res.ok) {
                throw new Error(`Upstream responded ${res.status} ${res.statusText}`);
            }
            return await res.text();
        } finally {
            clearTimeout(timer);
        }
    }

    private resolveUrl(href: string, base: string): string {
        try {
            return new URL(href, base).toString();
        } catch {
            return href;
        }
    }

    private dedupe(values: string[]): string[] {
        return Array.from(new Set(values));
    }

    /** Split a comma-separated selector list, ignoring commas inside ()/[]. */
    private splitSelectorList(selector: string): string[] {
        return this.splitTopLevel(selector, [',']).map((s) => s.trim()).filter(Boolean);
    }

    /** Split a single selector on descendant combinators (top-level whitespace). */
    private splitDescendant(selector: string): string[] {
        const out: string[] = [];
        let depth = 0;
        let cur = '';
        for (let i = 0; i < selector.length; i++) {
            const ch = selector[i];
            if (ch === '(' || ch === '[') depth++;
            else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

            if (depth === 0 && /\s/.test(ch)) {
                if (cur.trim()) out.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
    }

    /**
     * Decide how a descendant segment should appear once nested. A leading
     * combinator (> + ~) or a pseudo/compound that should hug the parent is
     * prefixed with `&`; a plain element/class becomes a normal nested selector.
     */
    private nestSegment(seg: string): string {
        if (/^[>+~]/.test(seg)) return `& ${seg}`;
        if (/^(:|::|&)/.test(seg)) return seg.startsWith('&') ? seg : `&${seg}`;
        return seg;
    }

    /** Generic top-level splitter that respects ()/[] nesting. */
    private splitTopLevel(input: string, separators: string[]): string[] {
        const out: string[] = [];
        let depth = 0;
        let cur = '';
        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            if (ch === '(' || ch === '[') depth++;
            else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

            if (depth === 0 && separators.includes(ch)) {
                out.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        out.push(cur);
        return out;
    }

    /** Repeat/trim a seed list of colours to exactly `count` entries. */
    private spread(seed: string[], count: number): string[] {
        if (seed.length === 0) return [];
        const out: string[] = [];
        for (let i = 0; i < count; i++) out.push(seed[i % seed.length]);
        return out;
    }

    private fail(
        toolId: string,
        action: string,
        err: unknown,
        start: number,
        ip: string,
        ua: string,
    ): BadRequestException {
        const msg = err instanceof Error ? err.message : String(err);
        this.record({
            toolId,
            action,
            status: 'error',
            durationMs: Date.now() - start,
            ip,
            userAgent: ua,
            errorMessage: msg.slice(0, 500),
        });
        return new BadRequestException(msg);
    }

    /** Persist a usage row. Never throws — analytics must not break the tool. */
    private record(partial: Partial<ToolUsageLog>): void {
        this.repo
            .save(this.repo.create(partial))
            .catch((err) => this.logger.error('Failed to write tool usage log', err));
    }
}

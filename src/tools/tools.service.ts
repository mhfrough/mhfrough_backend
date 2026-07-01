import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';
import CleanCSS from 'clean-css';
import * as sass from 'sass';
import { ToolUsageLog } from './tool-usage.entity';
import { MinifyDto } from './dto/minify.dto';
import { TransformCssDto } from './dto/transform-css.dto';
import { ReportUsageDto } from './dto/report-usage.dto';

@Injectable()
export class ToolsService {
    private readonly logger = new Logger(ToolsService.name);

    constructor(
        @InjectRepository(ToolUsageLog)
        private readonly repo: Repository<ToolUsageLog>,
    ) { }

    // ── Public processing tools ───────────────────────────────────────────────

    async minify(dto: MinifyDto, ip: string, ua: string) {
        const { language, code, options } = dto;
        const start = Date.now();
        const bytesIn = Buffer.byteLength(code, 'utf8');

        try {
            let output: string;

            switch (language) {
                case 'html': {
                    output = await minifyHtml(code, {
                        collapseWhitespace: true,
                        removeComments: true,
                        minifyCSS: true,
                        minifyJS: true,
                        removeRedundantAttributes: true,
                        removeEmptyAttributes: true,
                        useShortDoctype: true,
                        ...(options ?? {}),
                    });
                    break;
                }
                case 'css': {
                    const result = new CleanCSS({}).minify(code);
                    if (result.errors.length) {
                        throw new Error(result.errors.join('; '));
                    }
                    output = result.styles;
                    break;
                }
                case 'js': {
                    const result = await minifyJs(code, {});
                    if (!result.code) {
                        throw new Error('Minification produced no output');
                    }
                    output = result.code;
                    break;
                }
                default:
                    throw new Error(`Unsupported language: ${language as string}`);
            }

            const bytesOut = Buffer.byteLength(output, 'utf8');
            const durationMs = Date.now() - start;
            const savedBytes = bytesIn - bytesOut;
            const savedPct = bytesIn > 0 ? Math.round((savedBytes / bytesIn) * 10000) / 100 : 0;

            this.record({
                toolId: 'minify',
                action: `minify-${language}`,
                status: 'success',
                bytesIn,
                bytesOut,
                durationMs,
                ip,
                userAgent: ua,
            });

            return { output, bytesIn, bytesOut, savedBytes, savedPct, durationMs };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.record({
                toolId: 'minify',
                action: `minify-${language}`,
                status: 'error',
                bytesIn,
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
                errorMessage: msg.slice(0, 500),
            });
            throw new BadRequestException(msg);
        }
    }

    async transformCss(dto: TransformCssDto, ip: string, ua: string) {
        const { from, to, code, minify } = dto;
        const start = Date.now();

        try {
            let output: string;

            if (from === 'scss' && to === 'css') {
                output = sass.compileString(code, {
                    style: minify ? 'compressed' : 'expanded',
                }).css;
            } else if (from === 'css' && to === 'scss') {
                // Valid CSS is valid SCSS; optionally compress.
                output = minify ? this.cleanCss(code) : code;
            } else if (from === 'css' && to === 'css') {
                // Format / validate via clean-css (it parses & re-emits).
                output = this.cleanCss(code);
            } else if (from === 'scss' && to === 'scss') {
                // Compile-then-recompile to validate & format the SCSS.
                output = sass.compileString(code, {
                    style: minify ? 'compressed' : 'expanded',
                }).css;
            } else {
                throw new Error(`Unsupported conversion: ${from} -> ${to}`);
            }

            const durationMs = Date.now() - start;

            this.record({
                toolId: 'css-scss',
                action: `${from}-to-${to}`,
                status: 'success',
                bytesIn: Buffer.byteLength(code, 'utf8'),
                bytesOut: Buffer.byteLength(output, 'utf8'),
                durationMs,
                ip,
                userAgent: ua,
            });

            return { output, durationMs };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.record({
                toolId: 'css-scss',
                action: `${from}-to-${to}`,
                status: 'error',
                bytesIn: Buffer.byteLength(code, 'utf8'),
                durationMs: Date.now() - start,
                ip,
                userAgent: ua,
                errorMessage: msg.slice(0, 500),
            });
            throw new BadRequestException(msg);
        }
    }

    async logUsage(dto: ReportUsageDto, ip: string, ua: string) {
        this.record({
            toolId: dto.toolId,
            action: dto.action ?? null,
            status: 'success',
            metadata: dto.metadata ?? null,
            ip,
            userAgent: ua,
        });
        return { ok: true };
    }

    // ── Admin analytics ───────────────────────────────────────────────────────

    async findAll(page: number, limit: number) {
        const [items, total] = await this.repo.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit, pages: Math.ceil(total / limit) || 0 };
    }

    async getStats() {
        const total = await this.repo.count();
        const byTool = await this.repo
            .createQueryBuilder('t')
            .select('t.toolId', 'toolId')
            .addSelect('COUNT(*)', 'count')
            .groupBy('t.toolId')
            .orderBy('count', 'DESC')
            .getRawMany<{ toolId: string; count: string }>();

        return {
            total,
            byTool: byTool.map((r) => ({ toolId: r.toolId, count: Number(r.count) })),
        };
    }

    async clearAll() {
        await this.repo.clear();
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private cleanCss(code: string): string {
        const result = new CleanCSS({}).minify(code);
        if (result.errors.length) {
            throw new Error(result.errors.join('; '));
        }
        return result.styles;
    }

    /** Persist a usage row. Never throws — analytics must not break the tool. */
    private record(partial: Partial<ToolUsageLog>): void {
        this.repo
            .save(this.repo.create(partial))
            .catch((err) => this.logger.error('Failed to write tool usage log', err));
    }
}

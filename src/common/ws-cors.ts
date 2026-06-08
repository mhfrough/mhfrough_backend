export function wsCorsOrigins(): string[] {
    return process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
        : ['http://localhost:4223'];
}

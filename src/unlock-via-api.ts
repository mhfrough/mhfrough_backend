import * as dotenv from 'dotenv';
import * as https from 'https';
import * as http from 'http';

dotenv.config();

const BASE_URL = process.argv[2];

if (!BASE_URL) {
    console.error('Usage: ts-node src/unlock-via-api.ts <base-url>');
    process.exit(1);
}

const secret = process.env.UNLOCK_SECRET;

if (!secret) {
    console.error('UNLOCK_SECRET is not set in .env');
    process.exit(1);
}

const url = new URL('/api/v1/auth/unlock-account', BASE_URL);
const isHttps = url.protocol === 'https:';
const body = '';

const options: http.RequestOptions = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
        'x-unlock-secret': secret,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

console.log(`Sending unlock request to ${url.toString()} ...`);

const transport = isHttps ? https : http;
const req = transport.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('Account unlocked:', data);
        } else {
            console.error(`Failed (HTTP ${res.statusCode}):`, data);
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error('Request error:', err.message);
    process.exit(1);
});

req.write(body);
req.end();

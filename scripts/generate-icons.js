/**
 * Generate PWA + extension icons (no npm dependencies — pure Node.js PNG)
 * Run: node scripts/generate-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const BG = [15, 23, 42, 255];
const FG = [16, 185, 129, 255];

function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
        }
    }
    return ~c >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function drawIconPixel(x, y, size) {
    const pad = size * 0.18;
    const barW = Math.max(1, size * 0.14);
    const gap = Math.max(1, size * 0.07);
    const baseY = size - pad;
    const bars = [size * 0.28, size * 0.42, size * 0.56];

    let x0 = pad;
    for (const h of bars) {
        if (inRect(x, y, x0, baseY - h, barW, h)) return FG;
        x0 += barW + gap;
    }

    // Letter "A" for larger sizes
    if (size >= 48) {
        const cx = size * 0.72;
        const cy = size * 0.5;
        const s = size * 0.22;
        const nx = (x - cx) / s;
        const ny = (y - cy) / s;
        const onLeftLeg  = nx >= -0.45 && nx <= -0.15 && ny >= -0.5 && ny <= 0.5 && (ny + 0.5) >= (nx + 0.45) * 0.9;
        const onRightLeg = nx >= 0.15 && nx <= 0.45 && ny >= -0.5 && ny <= 0.5 && (ny + 0.5) >= (-nx + 0.45) * 0.9;
        const onCrossbar = ny >= -0.05 && ny <= 0.12 && nx >= -0.28 && nx <= 0.28;
        if (onLeftLeg || onRightLeg || onCrossbar) return FG;
    }

    return BG;
}

function makePNG(size) {
    const width = size;
    const height = size;
    const raw = Buffer.alloc((width * 4 + 1) * height);

    for (let y = 0; y < height; y++) {
        const rowStart = y * (width * 4 + 1);
        raw[rowStart] = 0;
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = drawIconPixel(x, y, size);
            const i = rowStart + 1 + x * 4;
            raw[i] = r;
            raw[i + 1] = g;
            raw[i + 2] = b;
            raw[i + 3] = a;
        }
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

function writeIcon(filePath, size) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, makePNG(size));
    console.log(`Created ${path.relative(ROOT, filePath)} (${size}x${size})`);
}

writeIcon(path.join(ROOT, 'icon-192.png'), 192);
writeIcon(path.join(ROOT, 'icon-512.png'), 512);
writeIcon(path.join(ROOT, 'extension', 'icons', 'icon16.png'), 16);
writeIcon(path.join(ROOT, 'extension', 'icons', 'icon48.png'), 48);
writeIcon(path.join(ROOT, 'extension', 'icons', 'icon128.png'), 128);

console.log('Done.');

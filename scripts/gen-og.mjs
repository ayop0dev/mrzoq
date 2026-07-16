/**
 * Generate public/og-default.png — 1200×630 solid-color Open Graph image.
 * Run once: node scripts/gen-og.mjs
 * Requires only Node built-ins (no external dependencies).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const W = 1200;
const H = 630;

// Brand background: #EADED2
const BG_R = 234, BG_G = 222, BG_B = 210;
// Brand primary: #065830
const FG_R = 6, FG_G = 88, FG_B = 48;

// Build raw RGBA pixel rows. Each row: 1 filter byte (0=None) + W×3 RGB bytes.
const rowLen = 1 + W * 3;
const raw = new Uint8Array(H * rowLen);

for (let y = 0; y < H; y++) {
  const base = y * rowLen;
  raw[base] = 0; // filter: None

  for (let x = 0; x < W; x++) {
    // Centered band (brand color strip at vertical center)
    const inBand = y >= H * 0.42 && y < H * 0.58;
    // Side border: 60px solid brand color
    const inBorder = x < 60 || x >= W - 60;

    let r = BG_R, g = BG_G, b = BG_B;
    if (inBorder || inBand) {
      r = FG_R; g = FG_G; b = FG_B;
    }
    raw[base + 1 + x * 3] = r;
    raw[base + 2 + x * 3] = g;
    raw[base + 3 + x * 3] = b;
  }
}

const compressed = deflateSync(Buffer.from(raw));

// CRC-32 table
const crcTab = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTab[i] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = (crcTab[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
}

const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync('public/og-default.png', png);
console.log(`✓ public/og-default.png (${W}×${H}, ${png.length} bytes)`);

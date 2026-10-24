#!/usr/bin/env node
/**
 * Generates placeholder app icons without external tools:
 *   assets/icon.png  512x512 PNG
 *   assets/icon.ico  ICO container with a 256x256 PNG payload (Vista+)
 *   assets/icon.icns ICNS container with ic09 (512x512 PNG) + ic08 (256x256 PNG)
 * TODO: replace with the real EstudyAI artwork.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.resolve(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Rounded indigo square with a white "E" glyph. */
function renderPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.18; // corner radius
  const s = size / 512;
  const inE = (x, y) => {
    const left = 160 * s, right = 352 * s, top = 128 * s, bottom = 384 * s, t = 48 * s;
    if (x < left || x > right || y < top || y > bottom) return false;
    if (x < left + t) return true; // stem
    if (y < top + t) return true; // top bar
    if (y > bottom - t) return true; // bottom bar
    if (Math.abs(y - (top + bottom) / 2) < t / 2 && x < right - 32 * s) return true; // middle bar
    return false;
  };
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = Math.max(r - x, x - (size - 1 - r), 0);
      const dy = Math.max(r - y, y - (size - 1 - r), 0);
      const inside = dx * dx + dy * dy <= r * r;
      const i = row + 1 + x * 4;
      if (!inside) continue; // transparent
      const white = inE(x, y);
      const t = y / size;
      raw[i] = white ? 255 : Math.round(79 + (124 - 79) * t);
      raw[i + 1] = white ? 255 : Math.round(70 + (58 - 70) * t);
      raw[i + 2] = white ? 255 : Math.round(229 + (237 - 229) * t);
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png512 = renderPng(512);
const png256 = renderPng(256);

// PNG
fs.writeFileSync(path.join(outDir, 'icon.png'), png512);

// ICO (single 256x256 PNG entry; width/height byte 0 means 256)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2); // type: icon
icoHeader.writeUInt16LE(1, 4); // count
const icoEntry = Buffer.alloc(16);
icoEntry[0] = 0;
icoEntry[1] = 0;
icoEntry.writeUInt16LE(1, 4); // planes
icoEntry.writeUInt16LE(32, 6); // bpp
icoEntry.writeUInt32LE(png256.length, 8);
icoEntry.writeUInt32LE(6 + 16, 12);
fs.writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([icoHeader, icoEntry, png256]));

// ICNS
function icnsEntry(type, data) {
  const head = Buffer.alloc(8);
  head.write(type, 0, 'ascii');
  head.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([head, data]);
}
const body = Buffer.concat([icnsEntry('ic09', png512), icnsEntry('ic08', png256)]);
const icnsHead = Buffer.alloc(8);
icnsHead.write('icns', 0, 'ascii');
icnsHead.writeUInt32BE(body.length + 8, 4);
fs.writeFileSync(path.join(outDir, 'icon.icns'), Buffer.concat([icnsHead, body]));

console.log(`[icons] wrote icon.png, icon.ico, icon.icns to ${outDir}`);

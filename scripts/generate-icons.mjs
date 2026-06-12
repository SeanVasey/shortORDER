/**
 * Procedural PWA icon suite: the 25° beam mark on a transparent background
 * (locked PWA icon rule). Pure Node — a minimal PNG encoder over zlib, no
 * image dependencies.
 *
 * Run: npm run icons   (writes public/icons/)
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// ── minimal PNG encoder ─────────────────────────────────────────────────────

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── the beam mark ───────────────────────────────────────────────────────────

const TEAL = [0x00, 0xb8, 0xd9];
const BEAM = [0x4b, 0xc2, 0xf0];
const INDIGO = [0x45, 0x4c, 0xfc];
const ANGLE = (25 * Math.PI) / 180; // never off 25°

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

/** signed coverage of a rounded bar (capsule) in beam-rotated space */
function capsule(px, py, cx, cy, halfLen, halfWidth) {
  const dx = px - cx;
  const dy = py - cy;
  // rotate into beam space (beam runs along +x, rising at 25°)
  const x = dx * Math.cos(ANGLE) - dy * Math.sin(ANGLE);
  const y = dx * Math.sin(ANGLE) + dy * Math.cos(ANGLE);
  const qx = Math.max(Math.abs(x) - halfLen, 0);
  const d = Math.hypot(qx, y) - halfWidth;
  return { alpha: Math.min(1, Math.max(0, 0.5 - d)), t: (x / halfLen + 1) / 2 };
}

function render(size, scale) {
  const rgba = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const mainLen = size * 0.33 * scale;
  const mainWidth = size * 0.085 * scale;
  const accLen = size * 0.2 * scale;
  const accWidth = size * 0.04 * scale;
  const accOff = size * 0.17 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // supersample 2×2 for clean edges
      let alpha = 0;
      let color = [0, 0, 0];
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const px = x + ox;
        const py = y + oy;
        const main = capsule(px, py, c, c - accOff * 0.25, mainLen, mainWidth);
        const acc = capsule(
          px,
          py,
          c + accOff * Math.sin(ANGLE) * 1.4,
          c + accOff * Math.cos(ANGLE),
          accLen,
          accWidth,
        );
        if (main.alpha >= acc.alpha) {
          alpha += main.alpha;
          color = mix(TEAL, BEAM, Math.min(1, Math.max(0, main.t)));
        } else {
          alpha += acc.alpha;
          color = mix(BEAM, INDIGO, Math.min(1, Math.max(0, acc.t)));
        }
      }
      alpha /= 4;
      if (alpha > 0) {
        const i = (y * size + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = Math.round(alpha * 255);
      }
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT, { recursive: true });
const FILES = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  // maskable: art shrinks into the 80% safe zone
  ["maskable-192.png", 192, 0.72],
  ["maskable-512.png", 512, 0.72],
  ["apple-touch-icon.png", 180, 0.9],
];
for (const [name, size, scale] of FILES) {
  writeFileSync(join(OUT, name), render(size, scale));
  console.log(`wrote public/icons/${name}`);
}

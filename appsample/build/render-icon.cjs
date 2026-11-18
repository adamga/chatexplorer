// Pure zero-dependency Node.js renderer for build/icon.png (512px) and multi-size build/icon.ico.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tag = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
  return Buffer.concat([len, tag, data, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

function sdRoundedRect(px, py, x, y, w, h, r) {
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const qx = Math.abs(px - cx) - (w * 0.5 - r);
  const qy = Math.abs(py - cy) - (h * 0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax, v0y = cy - ay;
  const v1x = bx - ax, v1y = by - ay;
  const v2x = px - ax, v2y = py - ay;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const inv = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= 0 && v >= 0 && u + v <= 1;
}

function blend(dst, dr, dg, db, da) {
  if (da <= 0) return;
  const sa = clamp(da, 0, 1);
  const outA = sa + dst[3] * (1 - sa);
  if (outA <= 0) return;
  dst[0] = (dr * sa + dst[0] * dst[3] * (1 - sa)) / outA;
  dst[1] = (dg * sa + dst[1] * dst[3] * (1 - sa)) / outA;
  dst[2] = (db * sa + dst[2] * dst[3] * (1 - sa)) / outA;
  dst[3] = outA;
}

function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = 512 / size;
  const aa = scale * 0.85;
  const cosA = Math.cos((28 * Math.PI) / 180);
  const sinA = Math.sin((28 * Math.PI) / 180);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) * scale;
      const y = (py + 0.5) * scale;
      const pixel = [0, 0, 0, 0];

      // Background rounded square + radial glow + border
      const dBg = sdRoundedRect(x, y, 16, 16, 480, 480, 112);
      const covBg = clamp(0.5 - dBg / aa, 0, 1);
      if (covBg > 0) {
        const gt = clamp(((x - 16) + (y - 16)) / 960, 0, 1);
        blend(pixel, lerp(0x16, 0x05, gt), lerp(0x23, 0x0a, gt), lerp(0x1a, 0x07, gt), covBg);
        const gr = Math.hypot((x - 256) / (480 * 0.55), (y - 232) / (480 * 0.55));
        if (gr < 1) blend(pixel, 0xc5, 0xf4, 0x9d, (1 - gr) * 0.35 * covBg);
        const dStroke = Math.abs(sdRoundedRect(x, y, 17.5, 17.5, 477, 477, 110.5)) - 1.5;
        const covStroke = clamp(0.5 - dStroke / aa, 0, 1);
        if (covStroke > 0) blend(pixel, 0xc5, 0xf4, 0x9d, 0.22 * covStroke);
      }

      // Rotated orbit ellipse
      const rx = (x - 256) * cosA - (y - 256) * sinA;
      const ry = (x - 256) * sinA + (y - 256) * cosA;
      const eNorm = Math.hypot(rx / 170, ry / 68);
      if (eNorm > 0.2) {
        const gradLen = Math.hypot((2 * rx) / (170 * 170), (2 * ry) / (68 * 68));
        const dEll = Math.abs(eNorm - 1) / gradLen - 5;
        const covEll = clamp(0.5 - dEll / aa, 0, 1);
        if (covEll > 0) blend(pixel, 0xc5, 0xf4, 0x9d, 0.35 * covEll);
      }

      // Chat bubble + tail
      const dBody = sdRoundedRect(x, y, 108, 168, 296, 176, 42);
      const inTail = pointInTriangle(x, y, 190, 340, 254, 340, 190, 394);
      const covBubble = Math.max(clamp(0.5 - dBody / aa, 0, 1), inTail ? 1 : 0);
      if (covBubble > 0) {
        const lt = clamp(((x - 108) / 296 + (y - 168) / 226) * 0.5, 0, 1);
        blend(pixel, lerp(0xe4, 0x8f, lt), lerp(0xff, 0xd6, lt), lerp(0xc9, 0x5a, lt), covBubble);
      }

      // Message lines inside bubble
      const covLine1 = clamp(0.5 - sdRoundedRect(x, y, 160, 216, 150, 20, 10) / aa, 0, 1);
      if (covLine1 > 0) blend(pixel, 0x18, 0x20, 0x14, covLine1);
      const covLine2 = clamp(0.5 - sdRoundedRect(x, y, 160, 258, 196, 20, 10) / aa, 0, 1);
      if (covLine2 > 0) blend(pixel, 0x18, 0x20, 0x14, 0.55 * covLine2);

      // Orbit satellite dot + ring
      const dDot = Math.hypot(x - 404, y - 146);
      const covDot = clamp(0.5 - (dDot - 22) / aa, 0, 1);
      if (covDot > 0) blend(pixel, 0xc5, 0xf4, 0x9d, covDot);
      const covHalo = clamp(0.5 - (Math.abs(dDot - 36) - 3) / aa, 0, 1);
      if (covHalo > 0) blend(pixel, 0xc5, 0xf4, 0x9d, 0.3 * covHalo);

      const off = (py * size + px) * 4;
      rgba[off] = Math.round(clamp(pixel[0], 0, 255));
      rgba[off + 1] = Math.round(clamp(pixel[1], 0, 255));
      rgba[off + 2] = Math.round(clamp(pixel[2], 0, 255));
      rgba[off + 3] = Math.round(clamp(pixel[3] * 255, 0, 255));
    }
  }
  return encodePng(size, rgba);
}

fs.writeFileSync(path.join(__dirname, 'icon.png'), renderIcon(512));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map(renderIcon);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  header.writeUInt8(size >= 256 ? 0 : size, entry);
  header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
});
fs.writeFileSync(path.join(__dirname, 'icon.ico'), Buffer.concat([header, ...images]));

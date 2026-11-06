/**
 * Zero-dependency PNG pixel diff (visual regression, threshold mode).
 *
 * Decodes 8-bit non-interlaced PNGs (RGBA / RGB / palette) using only
 * node's built-in zlib — no external image library — and computes a
 * changed-pixel ratio so the visual gate can express "tolerate up to N%
 * pixel drift" instead of strict hash equality. Unsupported PNG variants
 * return null and callers fall back to the hash gate.
 */

const zlib = require('zlib');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Decode a PNG into { width, height, rgba: Uint8Array }.
 * @returns {{width:number, height:number, rgba:Uint8Array}|null}
 */
function decodePng(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  let palette = null;

  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length; // length + type + data + CRC
  }

  if (!width || !height) return null;
  if (bitDepth !== 8 || interlace !== 0) return null;
  if (![2, 3, 6].includes(colorType)) return null; // RGB / palette / RGBA

  let raw;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1; // palette rows index PLTE
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let prev = null;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    if (rowStart + stride + 1 > raw.length) return null;
    const filter = raw[rowStart];
    const line = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const byte = raw[rowStart + 1 + x];
      const left = x >= channels ? line[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value;
      switch (filter) {
        case 0: value = byte; break;
        case 1: value = byte + left; break;
        case 2: value = byte + up; break;
        case 3: value = byte + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
          const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          value = byte + pred;
          break;
        }
        default: return null;
      }
      line[x] = value & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const dst = (y * width + x) * 4;
      if (colorType === 6) {
        rgba[dst] = line[x * 4];
        rgba[dst + 1] = line[x * 4 + 1];
        rgba[dst + 2] = line[x * 4 + 2];
        rgba[dst + 3] = line[x * 4 + 3];
      } else if (colorType === 2) {
        rgba[dst] = line[x * 3];
        rgba[dst + 1] = line[x * 3 + 1];
        rgba[dst + 2] = line[x * 3 + 2];
        rgba[dst + 3] = 255;
      } else {
        const idx = line[x] * 3;
        if (!palette || idx + 2 >= palette.length + 3) return null;
        rgba[dst] = palette[idx];
        rgba[dst + 1] = palette[idx + 1];
        rgba[dst + 2] = palette[idx + 2];
        rgba[dst + 3] = 255;
      }
    }
    prev = line;
  }
  return { width, height, rgba };
}

/**
 * Changed-pixel ratio between two decoded images of identical size.
 * @returns {{changed:number, total:number, ratio:number}|{sizeMismatch:true}|null}
 */
function diffImages(a, b) {
  if (!a || !b) return null;
  if (a.width !== b.width || a.height !== b.height) return { sizeMismatch: true };
  const total = a.width * a.height;
  let changed = 0;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    if (a.rgba[o] !== b.rgba[o] || a.rgba[o + 1] !== b.rgba[o + 1]
      || a.rgba[o + 2] !== b.rgba[o + 2] || a.rgba[o + 3] !== b.rgba[o + 3]) {
      changed++;
    }
  }
  return { changed, total, ratio: total === 0 ? 0 : changed / total };
}

/**
 * Convenience: decode both buffers and diff.
 */
function pixelRatio(bufferA, bufferB) {
  return diffImages(decodePng(bufferA), decodePng(bufferB));
}

module.exports = { decodePng, diffImages, pixelRatio };

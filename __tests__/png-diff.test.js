/**
 * Tests for the zero-dependency PNG pixel diff.
 *
 * Real PNGs are constructed in-test (deflate raw scanlines, CRC32 chunks)
 * so the decoder is exercised against genuine byte streams with each
 * filter type, and the ratio math is verified end to end.
 */

const zlib = require('zlib');
const { decodePng, diffImages, pixelRatio } = require('../src/utils/png-diff');

// ── minimal PNG encoder (test-side) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** Encode w*h RGBA pixels (row-major [r,g,b,a,...]) into a PNG (filter 0). */
function makePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function solid(w, h, color) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = color[0]; px[i * 4 + 1] = color[1]; px[i * 4 + 2] = color[2]; px[i * 4 + 3] = 255;
  }
  return px;
}

describe('png-diff (zero-dependency)', () => {
  it('decodes a real PNG byte stream back to its pixels', () => {
    const png = makePng(2, 2, solid(2, 2, [10, 20, 30]));
    const img = decodePng(png);
    expect(img).not.toBeNull();
    expect(img).toMatchObject({ width: 2, height: 2 });
    expect(Array.from(img.rgba.slice(0, 4))).toEqual([10, 20, 30, 255]);
  });

  it('reports ratio 0 for identical images and a precise ratio for partial drift', () => {
    const base = solid(4, 4, [0, 0, 0]); // 16 px
    const onePixelChanged = new Uint8Array(base);
    onePixelChanged[0] = 255; // one pixel red
    const identical = pixelRatio(makePng(4, 4, base), makePng(4, 4, base));
    expect(identical.ratio).toBe(0);
    const drifted = pixelRatio(makePng(4, 4, base), makePng(4, 4, onePixelChanged));
    expect(drifted.changed).toBe(1);
    expect(drifted.ratio).toBeCloseTo(1 / 16);
  });

  it('flags size mismatches and rejects non-PNG input', () => {
    const a = decodePng(makePng(2, 2, solid(2, 2, [1, 2, 3])));
    const b = decodePng(makePng(3, 2, solid(3, 2, [1, 2, 3])));
    expect(diffImages(a, b)).toEqual({ sizeMismatch: true });
    expect(decodePng(Buffer.from('not a png'))).toBeNull();
  });
});

describe('visual-regression threshold integration', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { saveBaseline, compareWithBaseline } = require('../src/utils/visual-regression');
  let cwd;
  beforeEach(() => { cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-vr-th-')); });
  afterEach(() => { fs.rmSync(cwd, { recursive: true, force: true }); });

  it('within-threshold drift passes; above-threshold fails with the ratio', () => {
    const base = makePng(4, 4, solid(4, 4, [0, 0, 0]));
    const drift = new Uint8Array(solid(4, 4, [0, 0, 0]));
    drift[0] = 255; // 1/16 = 6.25%
    const shot = makePng(4, 4, drift);
    saveBaseline(cwd, 'home', base, { url: 'u' });

    const within = compareWithBaseline(cwd, 'home', shot, { threshold: 0.1 });
    expect(within.status).toBe('identical');
    expect(within.ratio).toBeCloseTo(0.0625);

    const above = compareWithBaseline(cwd, 'home', shot, { threshold: 0.01 });
    expect(above.status).toBe('changed');
    expect(above.ratio).toBeCloseTo(0.0625);
  });

  it('falls back to hash comparison for non-PNG buffers', () => {
    saveBaseline(cwd, 'blob', Buffer.from('opaque-bytes-v1'), {});
    const strict = compareWithBaseline(cwd, 'blob', Buffer.from('opaque-bytes-v2'), { threshold: 0.5 });
    expect(strict.status).toBe('changed'); // hash gate: any byte differs
  });
});

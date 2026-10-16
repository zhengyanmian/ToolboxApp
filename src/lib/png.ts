import pako from 'pako';

// 最小 PNG 编解码（支持 8-bit 灰度/RGB/RGBA，仅用于本 App 的图片混淆工具）
export type RawImage = { width: number; height: number; data: Uint8Array };

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(img: RawImage): Uint8Array {
  const { width, height, data } = img;
  const ch = 4; // 输出统一 RGBA
  const stride = width * ch;
  // 每行加 filter 0 字节
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  // zlib 压缩
  const compressed = pako.deflate(raw, { level: 6 }) as Uint8Array;

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const parts = [new Uint8Array(SIG), chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', new Uint8Array(0))];
  let total = 0;
  parts.forEach((p) => (total += p.length));
  const out = new Uint8Array(total);
  let off = 0;
  parts.forEach((p) => { out.set(p, off); off += p.length; });
  return out;
}

export function decodePng(bytes: Uint8Array): RawImage {
  for (let i = 0; i < 8; i++)
    if (bytes[i] !== SIG[i]) throw new Error('不是 PNG 文件');

  let width = 0;
  let height = 0;
  let colorType = 6;
  let bitDepth = 8;
  const idat: Uint8Array[] = [];
  let off = 8;

  while (off + 8 <= bytes.length) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + off, 8);
    const len = dv.getUint32(0);
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    const body = bytes.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      const d = new DataView(body.buffer, body.byteOffset, body.byteLength);
      width = d.getUint32(0);
      height = d.getUint32(4);
      bitDepth = body[8];
      colorType = body[9];
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('仅支持 8-bit PNG');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : -1;
  if (channels < 0) throw new Error('不支持的 PNG 颜色类型');

  const compressed = concat(idat);
  const raw = pako.inflate(compressed) as Uint8Array;
  const srcStride = width * channels;
  const data = new Uint8Array(width * height * 4);

  let pos = 0;
  let prev = new Uint8Array(srcStride);
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + srcStride);
    pos += srcStride;
    const cur = new Uint8Array(srcStride);
    for (let x = 0; x < srcStride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (v + pred) & 0xff;
          break;
        }
      }
      cur[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = x * channels;
      data[o] = cur[s];
      data[o + 1] = channels === 1 ? cur[s] : cur[s + 1];
      data[o + 2] = channels === 1 ? cur[s] : cur[s + 2];
      data[o + 3] = channels === 4 ? cur[s + 3] : 255;
    }
    prev = cur;
  }
  return { width, height, data };
}

function concat(arrs: Uint8Array[]): Uint8Array {
  let total = 0;
  arrs.forEach((a) => (total += a.length));
  const out = new Uint8Array(total);
  let off = 0;
  arrs.forEach((a) => { out.set(a, off); off += a.length; });
  return out;
}

import ReactNativeBlobUtil from 'react-native-blob-util';

// Hermes 没有 atob/btoa/TextDecoder/TextEncoder，ncmdump-js 需要它们
function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b < 0xe0) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      i += 2;
    } else if (b < 0xf0) {
      cp = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
      i += 3;
    } else {
      cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      i += 4;
    }
    out += String.fromCodePoint(cp);
  }
  return out;
}

function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000)
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 63),
        0x80 | ((cp >> 6) & 63),
        0x80 | (cp & 63),
      );
  }
  return new Uint8Array(out);
}

let installed = false;

export function installBrowserPolyfills(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as any;
  if (typeof g.atob !== 'function') {
    g.atob = (s: string) => ReactNativeBlobUtil.base64.decode(s);
  }
  if (typeof g.btoa !== 'function') {
    g.btoa = (s: string) => ReactNativeBlobUtil.base64.encode(s);
  }
  if (typeof g.TextDecoder !== 'function') {
    g.TextDecoder = class {
      constructor(_encoding?: string) {}
      decode(bytes: Uint8Array | ArrayBuffer): string {
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        return utf8Decode(u8);
      }
    };
  }
  if (typeof g.TextEncoder !== 'function') {
    g.TextEncoder = class {
      encode(s: string): Uint8Array {
        return utf8Encode(s);
      }
    };
  }
}

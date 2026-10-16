import ReactNativeBlobUtil from 'react-native-blob-util';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import jpeg from 'jpeg-js';
import { decodePng, RawImage } from './png';

export type { RawImage };

export function base64ToBytes(b64: string): Uint8Array {
  const bin = ReactNativeBlobUtil.base64.decode(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 === undefined) {
      out += '==';
    } else if (b2 === undefined) {
      out += B64_CHARS[(b1 & 15) << 2] + '=';
    } else {
      out += B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] + B64_CHARS[b2 & 63];
    }
  }
  return out;
}

/** 按文件字节解码 JPG/PNG 为 RGBA */
export function decodeImage(bytes: Uint8Array): RawImage {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 }) as RawImage;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return decodePng(bytes);
  }
  throw new Error('仅支持 JPG / PNG 图片');
}

/** 把 RGBA 字节编码为 PNG 并保存到相册「工具箱」，返回文件 URI */
export async function savePngToGallery(img: RawImage, namePrefix: string): Promise<string> {
  const { encodePng } = await import('./png');
  const png = encodePng(img);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${namePrefix}_${Date.now()}.png`;
  await ReactNativeBlobUtil.fs.writeFile(path, bytesToBase64(png), 'base64');
  await CameraRoll.save(path, { type: 'photo', album: '工具箱' });
  return path.startsWith('file://') ? path : 'file://' + path;
}

/** 从图片 URI 读取字节 */
export async function readImageBytes(uri: string): Promise<Uint8Array> {
  const path = uri.replace(/^file:\/\//, '');
  const b64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
  return base64ToBytes(b64);
}

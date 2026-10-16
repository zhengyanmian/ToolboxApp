import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import ReactNativeBlobUtil from 'react-native-blob-util';
import jpeg from 'jpeg-js';
import { Page, Card, Btn, Row, Field, C } from '../ui';
import { encodePng, decodePng, RawImage } from '../lib/png';

// ---------- 基础工具 ----------
function base64ToBytes(b64: string): Uint8Array {
  const bin = ReactNativeBlobUtil.base64.decode(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += CHARS[b0 >> 2];
    out += CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    if (b1 === undefined) {
      out += '==';
    } else if (b2 === undefined) {
      out += CHARS[(b1 & 15) << 2] + '=';
    } else {
      out += CHARS[((b1 & 15) << 2) | (b2 >> 6)] + CHARS[b2 & 63];
    }
  }
  return out;
}

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function decodeImage(bytes: Uint8Array): RawImage {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 }) as RawImage;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return decodePng(bytes);
  }
  throw new Error('仅支持 JPG / PNG 图片');
}

// 块乱序：同密钥可逆
function scramble(img: RawImage, key: string, blockSize: number, inverse: boolean): RawImage {
  const { width, height, data } = img;
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);
  const n = cols * rows;

  const rnd = mulberry32(hashKey(key));
  const map = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [map[i], map[j]] = [map[j], map[i]];
  }

  const out = new Uint8Array(data.length);
  const put = (bx: number, by: number, srcX: number, srcY: number) => {
    const cw = Math.min(blockSize, width - bx * blockSize);
    const chh = Math.min(blockSize, height - by * blockSize);
    const sw = Math.min(blockSize, width - srcX * blockSize);
    const sh = Math.min(blockSize, height - srcY * blockSize);
    // 尺寸不同（边缘块）时逐像素拷贝，多余区域清零
    for (let y = 0; y < blockSize; y++) {
      for (let x = 0; x < blockSize; x++) {
        const dox = bx * blockSize + x;
        const doy = by * blockSize + y;
        const d = (doy * width + dox) * 4;
        if (x >= cw || y >= chh || x >= sw || y >= sh) {
          out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
          continue;
        }
        const s = ((srcY * blockSize + y) * width + (srcX * blockSize + x)) * 4;
        out[d] = data[s];
        out[d + 1] = data[s + 1];
        out[d + 2] = data[s + 2];
        out[d + 3] = data[s + 3];
      }
    }
  };

  const bi = (i: number) => ({ x: i % cols, y: Math.floor(i / cols) });
  if (!inverse) {
    for (let i = 0; i < n; i++) {
      const s = bi(i);
      const d = bi(map[i]);
      put(d.x, d.y, s.x, s.y);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const s = bi(map[i]);
      const d = bi(i);
      put(d.x, d.y, s.x, s.y);
    }
  }
  return { width, height, data: out };
}

// ---------- 页面 ----------
export default function ImageScramble({ onBack }: { onBack: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [block, setBlock] = useState(64);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [lastKey, setLastKey] = useState('');

  const pick = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, (res) => {
      const a = res.assets?.[0];
      if (a?.uri) {
        setSrc(a.uri);
        setResult(null);
        setMsg('');
      }
    });
  };

  const run = async (inverse: boolean) => {
    if (!src || busy || !key.trim()) {
      if (!key.trim()) setMsg('请先输入密钥（自定义口令）');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const path = src.replace(/^file:\/\//, '');
      const b64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
      const bytes = base64ToBytes(b64);
      const img = decodeImage(bytes);
      const out = scramble(img, key.trim(), block, inverse);
      const png = encodePng(out);
      const target = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/scramble_${Date.now()}.png`;
      await ReactNativeBlobUtil.fs.writeFile(target, bytesToBase64(png), 'base64');
      await CameraRoll.save(target, { type: 'photo', album: '工具箱' });
      setResult(target.startsWith('file://') ? target : 'file://' + target);
      setLastKey(key.trim());
      setMsg(`已保存到相册「工具箱」${inverse ? '（还原结果）' : '（混淆结果）'}。还原时必须使用同一密钥：${key.trim()}`);
    } catch (e: any) {
      setMsg('处理失败：' + (e?.message || '未知错误'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="imgscramble" title="图片混淆 / 反混淆" onBack={onBack}>
      <Card>
        <Btn text={src ? '重新选图' : '从相册选图（JPG/PNG）'} onPress={pick} />
        {src && (
          <>
            <Image source={{ uri: src }} style={st.preview} resizeMode="contain" />
            {!result && <Text style={st.meta}>原图</Text>}
          </>
        )}
        {result && (
          <>
            <Image source={{ uri: result }} style={[st.preview, { marginTop: 8 }]} resizeMode="contain" />
            <Text style={st.meta}>最近结果（已存相册）</Text>
          </>
        )}
      </Card>

      <Card>
        <Field
          label="密钥（混淆与还原必须一致，请牢记）"
          value={key}
          onChange={setKey}
          placeholder="例如：my-secret-2026"
        />
        <Text style={st.label}>块大小（越小越乱、越难猜）</Text>
        <Row>
          {[32, 64, 128].map((b) => (
            <Btn key={b} text={`${b}px`} kind={block === b ? 'primary' : 'plain'} onPress={() => setBlock(b)} style={{ flex: 1 }} />
          ))}
        </Row>
      </Card>

      {src ? (
        <Row>
          <Btn text={busy ? '处理中…' : '🔒 混淆'} onPress={() => run(false)} />
          <Btn text="🔓 反混淆" onPress={() => run(true)} kind="plain" />
        </Row>
      ) : null}
      {msg ? <Text style={st.msg}>{msg}</Text> : null}

      <Card style={{ marginTop: 12 }}>
        <ScrollView>
          <Text style={st.tip}>
            原理：把图片切成小方块，用密钥生成伪随机排列后整体打乱（块大小一致时完全无损）。混淆后肉眼看不出内容；用同一密钥和块大小点「反混淆」即可精确还原。混淆结果以 PNG 保存到相册「工具箱」。注意：这是视觉遮挡，不是密码学加密，密钥丢失无法还原。
          </Text>
        </ScrollView>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  preview: { width: '100%', height: 220, marginTop: 12, borderRadius: 8, backgroundColor: '#00000010' },
  meta: { fontSize: 12, color: C.sub, marginTop: 6, textAlign: 'center' },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  input: { height: 0 },
  msg: { fontSize: 13, color: C.ok, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

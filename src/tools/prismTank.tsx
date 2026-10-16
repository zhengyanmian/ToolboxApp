import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Page, Card, Btn, Row, C } from '../ui';
import { decodeImage, readImageBytes, savePngToGallery, RawImage } from '../lib/imgio';

type Raw = RawImage;

// ---------- 处理管线 ----------
function downscale(src: Raw, block: number): Raw {
  const cols = Math.floor(src.width / block);
  const rows = Math.floor(src.height / block);
  const out = new Uint8Array(cols * rows * 4);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let r = 0, g = 0, b = 0;
      let n = 0;
      for (let y = gy * block; y < (gy + 1) * block; y++) {
        for (let x = gx * block; x < (gx + 1) * block; x++) {
          const o = (y * src.width + x) * 4;
          r += src.data[o];
          g += src.data[o + 1];
          b += src.data[o + 2];
          n++;
        }
      }
      const o = (gy * cols + gx) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { width: cols, height: rows, data: out };
}

function applyContrast(img: Raw, k: number): Float32Array {
  const { width, height, data } = img;
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    let v = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    v = (v - 128) * k + 128;
    luma[i] = Math.max(0, Math.min(255, v));
  }
  return luma;
}

// Floyd–Steinberg 误差扩散，iterations 次迭代
function diffuse(luma: Float32Array, width: number, height: number, threshold: number, iterations: number): Uint8Array {
  let buf = Float32Array.from(luma);
  const out = new Uint8Array(width * height);
  for (let iter = 0; iter < iterations; iter++) {
    const err2 = new Float32Array(buf.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const old = Math.max(0, Math.min(255, buf[i]));
        const nv = old >= threshold ? 255 : 0;
        const e = old - nv;
        out[i] = Math.max(out[i], nv); // 多轮迭代取「更亮」结果
        if (x + 1 < width) buf[i + 1] += (e * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) buf[i + width - 1] += (e * 3) / 16;
          buf[i + width] += (e * 5) / 16;
          if (x + 1 < width) buf[i + width + 1] += e / 16;
        }
      }
    }
    void err2;
  }
  return out;
}

const PALETTES: Record<string, number[][]> = {
  蓝: [
    [10, 25, 66],
    [24, 82, 178],
    [34, 170, 255],
    [130, 220, 255],
    [235, 250, 255],
  ],
  青: [
    [6, 46, 51],
    [12, 120, 130],
    [20, 200, 210],
    [120, 240, 240],
    [235, 255, 255],
  ],
  紫: [
    [30, 14, 66],
    [84, 34, 178],
    [150, 80, 255],
    [210, 150, 255],
    [248, 240, 255],
  ],
  绿: [
    [8, 46, 26],
    [14, 118, 66],
    [30, 200, 120],
    [130, 245, 180],
    [236, 255, 245],
  ],
};

function colorize(mask: Uint8Array, width: number, height: number, palette: number[][]): Raw {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (mask[i] === 0) {
      out[o] = 8;
      out[o + 1] = 12;
      out[o + 2] = 22;
      out[o + 3] = 255;
      continue;
    }
    // 按亮度在色板里插值：亮像素接近白色
    const src = palette[0];
    const t = Math.min(1, (palette.length - 1));
    void t;
    // 分 4 档：按位置（暗→亮）取色板
    const x = i % width;
    const y = (i / width) | 0;
    void x; void y;
    const level = Math.min(palette.length - 1, 1 + Math.floor((mask[i] / 255) * (palette.length - 1.01)));
    const col = palette[level];
    out[o] = col[0];
    out[o + 1] = col[1];
    out[o + 2] = col[2];
    out[o + 3] = 255;
  }
  return { width, height, data: out };
}

function process(src: Raw, block: number, contrast: number, threshold: number, iterations: number, palette: number[][]): Raw {
  const small = downscale(src, block);
  const luma = applyContrast(small, contrast);
  const mask = diffuse(luma, small.width, small.height, threshold, iterations);
  return colorize(mask, small.width, small.height, palette);
}

// ---------- 页面 ----------
export default function PrismTank({ onBack }: { onBack: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [block, setBlock] = useState(4);
  const [contrast, setContrast] = useState(1.6);
  const [threshold, setThreshold] = useState(128);
  const [palName, setPalName] = useState<keyof typeof PALETTES>('蓝');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

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

  const run = async () => {
    if (!src || busy) return;
    setBusy(true);
    setMsg('');
    try {
      const bytes = await readImageBytes(src);
      const img = decodeImage(bytes);
      // 超大图先粗缩到最长边 1600，避免手机上纯 JS 跑太久
      let work = img;
      const maxSide = Math.max(img.width, img.height);
      if (maxSide > 1600) {
        const f = Math.ceil(maxSide / 1600);
        work = downscale(img, f);
      }
      const out = process(work, block, contrast, threshold, 2, PALETTES[palName]);
      const uri = await savePngToGallery(out, 'prism');
      setResult(uri);
      setMsg('已保存到相册「工具箱」');
    } catch (e: any) {
      setMsg('处理失败：' + (e?.message || '未知错误'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="prism" title="光棱坦克图片" onBack={onBack}>
      <Card>
        <Btn text={src ? '重新选图' : '从相册选图'} onPress={pick} />
        {src && (
          <>
            <Image source={{ uri: result || src }} style={st.preview} resizeMode="contain" />
            {result && <Text style={st.meta}>处理结果（已存相册）</Text>}
          </>
        )}
      </Card>

      <Card>
        <Text style={st.label}>像素块大小</Text>
        <Row>
          {[2, 4, 6, 8].map((b) => (
            <Btn key={b} text={`${b}px`} kind={block === b ? 'primary' : 'plain'} onPress={() => setBlock(b)} style={{ flex: 1 }} />
          ))}
        </Row>
        <Text style={st.label}>对比度</Text>
        <Row>
          {[
            { n: '低', v: 1.2 },
            { n: '中', v: 1.6 },
            { n: '高', v: 2.2 },
          ].map((o) => (
            <Btn key={o.n} text={o.n} kind={contrast === o.v ? 'primary' : 'plain'} onPress={() => setContrast(o.v)} style={{ flex: 1 }} />
          ))}
        </Row>
        <Text style={st.label}>阈值</Text>
        <Row>
          {[
            { n: '偏暗', v: 90 },
            { n: '标准', v: 128 },
            { n: '偏亮', v: 170 },
          ].map((o) => (
            <Btn key={o.n} text={o.n} kind={threshold === o.v ? 'primary' : 'plain'} onPress={() => setThreshold(o.v)} style={{ flex: 1 }} />
          ))}
        </Row>
        <Text style={st.label}>配色</Text>
        <Row>
          {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((p) => (
            <Btn key={p} text={p} kind={palName === p ? 'primary' : 'plain'} onPress={() => setPalName(p)} style={{ flex: 1 }} />
          ))}
        </Row>
      </Card>

      {src ? (
        <Btn text={busy ? '处理中…（大图需几秒）' : '生成光棱坦克图片'} onPress={run} />
      ) : null}
      {msg ? <Text style={st.msg}>{msg}</Text> : null}

      <Card style={{ marginTop: 12 }}>
        <Text style={st.tip}>
          效果还原「光棱坦克工厂」的思路：像素化 → 对比度增强 → 亮度阈值 + Floyd–Steinberg 误差扩散抖动（2 轮迭代）→ 暗底发光配色，把任何照片变成红警光棱坦克风格的霓虹像素画。全部本地计算，结果以 PNG 保存到相册。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  preview: { width: '100%', height: 240, marginTop: 12, borderRadius: 8, backgroundColor: '#000' },
  meta: { fontSize: 12, color: C.sub, marginTop: 6, textAlign: 'center' },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  msg: { fontSize: 13, color: C.ok, textAlign: 'center', marginTop: 10, lineHeight: 18 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

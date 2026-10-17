import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Btn, Card, Chip, Icon, Page, Segmented, Slider, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { RawImage, bytesToBase64, decodeImage, readImageBytes, savePngToGallery } from '../lib/imgio';
import { encodePng } from '../lib/png';

/** 处理边长：光棱坦克本质是噪点，640 足够，再大手机算不动 */
const MAX_SIDE = 640;
const MAX_BYTES = 40 * 1024 * 1024;

type PixelMode = 'standard' | 'average';

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** 最近邻缩放到最大边不超过 max */
function fitMax(src: RawImage, max: number): RawImage {
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  if (scale >= 1) return src;
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y / h) * src.height));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / w) * src.width));
      const si = (sy * src.width + sx) * 4;
      const di = (y * w + x) * 4;
      out[di] = src.data[si];
      out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2];
      out[di + 3] = 255;
    }
  }
  return { width: w, height: h, data: out };
}

/** 3×3 均值（重复调用 = 多次扩散，让画面更「散」、远看更清楚） */
function blur3(src: any, w: number, h: number): any {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y < h - 1 ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x < w - 1 ? x + 1 : w - 1;
      const sum =
        src[y0 * w + x0] + src[y0 * w + x] + src[y0 * w + x1] +
        src[y * w + x0] + src[y * w + x] + src[y * w + x1] +
        src[y1 * w + x0] + src[y1 * w + x] + src[y1 * w + x1];
      out[y * w + x] = sum / 9;
    }
  }
  return out;
}

/**
 * 光棱坦克生成：
 *  1) 按对比度拉开明暗
 *  2) 扩散：重复 3×3 均值，次数越多越「散」，远看反而越清楚
 *  3) 抖动：Floyd–Steinberg 误差扩散把每个通道压成纯黑/纯亮，
 *     近看是噪点，缩小或退远看则还原出原图的明暗与颜色
 */
function makePrism(
  src: RawImage,
  o: { threshold: number; contrast: number; mode: PixelMode; iterations: number },
): RawImage {
  const w = src.width;
  const h = src.height;
  const n = w * h;
  const r = new Float32Array(n);
  const g = new Float32Array(n);
  const b = new Float32Array(n);

  for (let i = 0, j = 0; i < n; i++, j += 4) {
    r[i] = clamp255((src.data[j] - 128) * o.contrast + 128);
    g[i] = clamp255((src.data[j + 1] - 128) * o.contrast + 128);
    b[i] = clamp255((src.data[j + 2] - 128) * o.contrast + 128);
  }

  let sr: any = r;
  let sg: any = g;
  let sb: any = b;
  for (let k = 0; k < o.iterations; k++) {
    sr = blur3(sr, w, h);
    sg = blur3(sg, w, h);
    sb = blur3(sb, w, h);
  }

  // 「临近平均」：阈值取局部平均，明暗过渡更柔；否则用固定阈值
  const ar = o.mode === 'average' ? blur3(r, w, h) : null;
  const ag = o.mode === 'average' ? blur3(g, w, h) : null;
  const ab = o.mode === 'average' ? blur3(b, w, h) : null;

  const out = new Uint8Array(n * 4);
  const T = o.threshold;

  const dither = (buf: any, thr: any, ch: number) => {
    const err = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const v = buf[i] + err[i];
        const t = thr ? thr[i] : T;
        const q = v >= t ? 255 : 0;
        const e = v - q;
        if (x + 1 < w) err[i + 1] += (e * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) err[i + w - 1] += (e * 3) / 16;
          err[i + w] += (e * 5) / 16;
          if (x + 1 < w) err[i + w + 1] += (e * 1) / 16;
        }
        out[i * 4 + ch] = q;
      }
    }
  };

  dither(sr, ar, 0);
  dither(sg, ag, 1);
  dither(sb, ab, 2);
  for (let i = 0; i < n; i++) out[i * 4 + 3] = 255;

  return { width: w, height: h, data: out };
}

export default function PrismTank({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [src, setSrc] = useState<RawImage | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [err, setErr] = useState('');
  const [threshold, setThreshold] = useState(128);
  const [contrast, setContrast] = useState(1);
  const [mode, setMode] = useState<PixelMode>('standard');
  const [iterations, setIterations] = useState(1);
  const [saved, setSaved] = useState('');
  const [outImg, setOutImg] = useState<RawImage | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  /** 参数变化后延迟重算，拖动滑杆时不会卡 */
  useEffect(() => {
    if (!src) return;
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    timer.current = setTimeout(() => {
      try {
        setBusy(true);
        setStage('正在生成…');
        const out = makePrism(src, { threshold, contrast, mode, iterations });
        if (id !== seq.current) return;
        setOutImg(out);
        const b64 = bytesToBase64(encodePng(out));
        setPreview('data:image/png;base64,' + b64);
        setErr('');
      } catch (e: any) {
        setErr(e?.message || '生成失败');
      } finally {
        setBusy(false);
        setStage('');
      }
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [src, threshold, contrast, mode, iterations]);

  const pick = useCallback(async () => {
    setErr('');
    setSaved('');
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      if ((asset.fileSize ?? 0) > MAX_BYTES) {
        setErr('图片超过 40MB，换一张小一点的');
        return;
      }
      setBusy(true);
      setStage('正在读取图片…');
      const bytes = await readImageBytes(asset.uri);
      const raw = fitMax(decodeImage(bytes), MAX_SIDE);
      setSrc(raw);
    } catch (e: any) {
      setErr(e?.message || '无法读取这张图片');
    } finally {
      setBusy(false);
      setStage('');
    }
  }, []);

  const save = async () => {
    if (!outImg) return;
    try {
      setBusy(true);
      setStage('正在保存 PNG…');
      await savePngToGallery(outImg, 'prism');
      setSaved('已保存到相册「工具箱」');
      setErr('');
    } catch (e: any) {
      setErr(e?.message || '保存失败，请检查相册权限');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  return (
    <Page id="prism" title="光棱坦克" onBack={onBack} noDetail>
      <Card pad={13}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn text={src ? '换一张' : '加载图片'} icon="image" onPress={pick} style={{ flex: 1 }} />
          <Btn
            text="保存 PNG"
            icon="copy"
            kind="plain"
            onPress={save}
            disabled={!outImg}
            style={{ flex: 1 }}
          />
        </View>
        {busy ? (
          <View style={st.busyRow}>
            <ActivityIndicator size="small" color={p.primary} />
            <Text style={[st.busyTxt, { color: p.sub }]}>{stage || '处理中…'}</Text>
          </View>
        ) : null}
        {err ? <Text style={[st.err, { color: p.warn }]}>{err}</Text> : null}
        {saved ? (
          <View style={st.busyRow}>
            <Icon name="check" size={14} color={p.ok} />
            <Text style={[st.busyTxt, { color: p.ok }]}>{saved}</Text>
          </View>
        ) : null}
      </Card>

      {/* 画布：只有一张，所见即所得 */}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <View style={[st.canvas, { backgroundColor: p.isDark ? '#0a0a0a' : '#f0f1f3' }]}>
          {preview ? (
            <Image source={{ uri: preview }} style={st.img} resizeMode="contain" />
          ) : (
            <Tap onPress={pick} style={st.emptyTap}>
              <Icon name="layers" size={30} color={p.faint} />
              <Text style={[st.empty, { color: p.sub }]}>加载一张图片开始</Text>
              <Text style={[st.emptySub, { color: p.faint }]}>
                近看是噪点，缩小或退远看才会浮现原图
              </Text>
            </Tap>
          )}
        </View>
      </Card>

      <Card>
        <Text style={[st.sec, { color: p.text }]}>1. 阈值调整</Text>
        <Slider
          value={threshold}
          min={16}
          max={240}
          step={1}
          onChange={setThreshold}
          format={(v) => `${Math.round(v)}`}
          style={{ marginBottom: 4 }}
        />
        <Text style={[st.note, { color: p.faint }]}>
          决定「多亮算亮」。数值越小画面越亮、颗粒越稀；越大越暗、颗粒越密。
        </Text>
      </Card>

      <Card>
        <View style={st.rowBetween}>
          <Text style={[st.sec, { color: p.text, marginBottom: 0 }]}>2. 对比度调整</Text>
          <Chip text="重置" icon="refresh" onPress={() => setContrast(1)} />
        </View>
        <Slider
          value={contrast}
          min={0.3}
          max={2.6}
          step={0.05}
          onChange={setContrast}
          format={(v) => `${v.toFixed(2)}×`}
          style={{ marginTop: 8, marginBottom: 2 }}
        />
      </Card>

      <Card>
        <Text style={[st.sec, { color: p.text }]}>3. 其他像素处理方式</Text>
        <Segmented
          options={[
            { label: '标准抖动', value: 'standard' },
            { label: '临近平均', value: 'average' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as PixelMode)}
        />
        <Text style={[st.note, { color: p.faint }]}>
          {mode === 'standard'
            ? '标准抖动：颗粒更硬、噪点感更强，适合缩小看。'
            : '临近平均：阈值取周围平均，明暗过渡更柔，适合大图远看。'}
        </Text>
      </Card>

      <Card>
        <Text style={[st.sec, { color: p.text }]}>4. 扩散迭代次数</Text>
        <Slider
          value={iterations}
          min={0}
          max={8}
          step={1}
          onChange={setIterations}
          format={(v) => `${Math.round(v)} 次`}
          style={{ marginBottom: 2 }}
        />
        <Text style={[st.note, { color: p.faint }]}>
          次数越多画面越「散」，细节被摊平，远看时轮廓反而更清楚；0 次保留最多细节。
        </Text>
      </Card>

      <Card pad={13}>
        <Text style={[st.note, { color: p.sub, marginTop: 0 }]}>
          保存后在相册里把图片缩小、或者把手机拿远眯眼看，隐藏的画面才会浮出来。这就是「光棱坦克」的原理：
          近处是黑白颗粒，远处的明暗平均值才是原图。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles(() =>
  StyleSheet.create({
    canvas: {
      width: '100%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    img: { width: '100%', height: '100%' },
    emptyTap: {
      flex: 1,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    empty: { fontSize: 14.5, fontWeight: '600' },
    emptySub: { fontSize: 11.5, textAlign: 'center', paddingHorizontal: 24, lineHeight: 17 },
    sec: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
    note: { fontSize: 11.5, lineHeight: 17, marginTop: 4 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
    busyTxt: { fontSize: 12.5 },
    err: { fontSize: 12.5, marginTop: 10, lineHeight: 18 },
  }),
);

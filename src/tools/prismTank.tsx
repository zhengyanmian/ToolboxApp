import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Btn,
  Card,
  Icon,
  Loading,
  Page,
  Row,
  SectionTitle,
  Segmented,
  Slider,
  Tap,
  dynStyles,
} from '../ui';
import { usePalette } from '../theme';
import { RawImage, bytesToBase64, decodeImage, readImageBytes, savePngToGallery } from '../lib/imgio';
import { encodePng } from '../lib/png';

type Mode = 'composed' | 'revealDisplay' | 'revealHidden';
/** 同一尺寸下的三张图：合成图 / 显示图 / 隐藏图 */
type ImageSet = { out: RawImage; d: RawImage; h: RawImage };

const MAX_SIDE = 1100; // 限制合成尺寸，保证手机端运算速度
const PREVIEW_SIDE = 900; // 预览缩略图最大边
const MAX_BYTES = 40 * 1024 * 1024; // 单张图片文件上限
const MAX_PIXELS = 24_000_000; // 解码后像素上限，防止内存不足

const MODES: { label: string; value: Mode }[] = [
  { label: '合成图', value: 'composed' },
  { label: '还原显示图', value: 'revealDisplay' },
  { label: '还原隐藏图', value: 'revealHidden' },
];

const MODE_HINT: Record<Mode, string> = {
  composed: '合成图直接看就是「显示图」。把下方压暗强度调大，隐藏图会逐渐浮现。',
  revealDisplay: '按 out² ÷ 隐藏图 反解，应当还原出原始显示图。',
  revealHidden: '按 out² ÷ 显示图 反解，应当还原出原始隐藏图。',
};

/** 最近邻采样到指定尺寸 */
function sampleTo(src: RawImage, w: number, h: number): RawImage {
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

/** 限制最大边 */
function fitDims(w: number, h: number): [number, number] {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

/** 缩略：最大边不超过 maxSide，否则最近邻采样 */
function downscaleTo(src: RawImage, maxSide: number): RawImage {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  if (scale >= 1) return src;
  return sampleTo(src, Math.max(1, Math.round(src.width * scale)), Math.max(1, Math.round(src.height * scale)));
}

/** 合成：out = √(显示图 × 隐藏图) */
function compose(d: RawImage, h: RawImage): RawImage {
  const n = d.data.length;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    for (let c = 0; c < 3; c++) {
      const dv = d.data[i + c] / 255;
      const hv = h.data[i + c] / 255;
      out[i + c] = Math.round(Math.sqrt(dv * hv) * 255);
    }
    out[i + 3] = 255;
  }
  return { width: d.width, height: d.height, data: out };
}

/** 反解：out² ÷ 已知图 = 未知图 */
function divide(out: RawImage, known: RawImage): RawImage {
  const n = out.data.length;
  const res = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    for (let c = 0; c < 3; c++) {
      const oN = out.data[i + c] / 255;
      const kN = Math.max(0.02, known.data[i + c] / 255);
      res[i + c] = Math.max(0, Math.min(255, Math.round(((oN * oN) / kN) * 255)));
    }
    res[i + 3] = 255;
  }
  return { width: out.width, height: out.height, data: res };
}

/** gamma 压暗：v = pow(v, k)，k>1 变暗 */
function gamma(img: RawImage, k: number): RawImage {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.round(Math.pow(i / 255, k) * 255);
  const n = img.data.length;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    out[i] = lut[img.data[i]];
    out[i + 1] = lut[img.data[i + 1]];
    out[i + 2] = lut[img.data[i + 2]];
    out[i + 3] = 255;
  }
  return { width: img.width, height: img.height, data: out };
}

/** 按模式取图，并叠加压暗强度（0-100） */
function renderMode(mode: Mode, set: ImageSet, dark: number): RawImage {
  let img: RawImage;
  if (mode === 'composed') img = set.out;
  else if (mode === 'revealDisplay') img = divide(set.out, set.h);
  else img = divide(set.out, set.d);
  return dark > 0 ? gamma(img, 1 + (dark / 100) * 2.6) : img;
}

async function encodePreview(img: RawImage): Promise<string> {
  return 'data:image/png;base64,' + bytesToBase64(encodePng(img));
}

/** 把底层异常转成可读提示 */
function readable(e: any): string {
  const m = String(e?.message || e || '');
  if (/JPG \/ PNG/.test(m)) return '仅支持 JPG / PNG 图片，请重新选择';
  if (/memory|allocation|out of/i.test(m)) return '内存不足，请选择尺寸更小的图片';
  if (/分辨率|过大/.test(m)) return m;
  return m || '处理失败，请重试';
}

export default function PrismTank({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [dispUri, setDispUri] = useState<string | null>(null);
  const [hideUri, setHideUri] = useState<string | null>(null);
  const [dispName, setDispName] = useState('');
  const [hideName, setHideName] = useState('');

  const [full, setFull] = useState<ImageSet | null>(null); // 原始合成尺寸，用于保存
  const [thumb, setThumb] = useState<ImageSet | null>(null); // 缩略图，用于预览
  const [mode, setMode] = useState<Mode>('composed');
  const [dark, setDark] = useState(0);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [gen, setGen] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  const genRef = useRef(0);

  // 预览生成（防抖 + 过期令牌），只作用于缩略图，保证拖动滑块流畅
  useEffect(() => {
    if (!thumb) {
      setPreviewUri(null);
      return;
    }
    const token = ++genRef.current;
    setGen(true);
    const tid = setTimeout(() => {
      let task: Promise<string>;
      try {
        task = encodePreview(renderMode(mode, thumb, dark));
      } catch (e: any) {
        setErr('预览生成失败：' + readable(e));
        setGen(false);
        return;
      }
      task
        .then((u) => {
          if (genRef.current === token) {
            setPreviewUri(u);
            setErr('');
          }
        })
        .catch((e) => {
          if (genRef.current === token) setErr('预览生成失败：' + readable(e));
        })
        .finally(() => {
          if (genRef.current === token) setGen(false);
        });
    }, 140);
    return () => clearTimeout(tid);
  }, [thumb, mode, dark]);

  function pick(target: 'disp' | 'hide') {
    setErr('');
    try {
      launchImageLibrary({ mediaType: 'photo', quality: 1 }, (res) => {
        if (res.didCancel) return;
        if (res.errorCode) {
          setErr('打开相册失败：' + (res.errorMessage || res.errorCode));
          return;
        }
        const a = res.assets?.[0];
        if (!a?.uri) return;
        const uri = a.uri;
        const nm = a.fileName || uri.split('/').pop() || '已选择图片';
        if (target === 'disp') {
          setDispUri(uri);
          setDispName(nm);
        } else {
          setHideUri(uri);
          setHideName(nm);
        }
        setFull(null);
        setThumb(null);
        setPreviewUri(null);
        setSaved(false);
      });
    } catch (e: any) {
      setErr('无法打开相册：' + readable(e));
    }
  }

  async function doCompose() {
    if (!dispUri || !hideUri) {
      setErr('请先选择显示图与隐藏图');
      return;
    }
    setErr('');
    setSaved(false);
    setBusy('正在解码两张图片…');
    try {
      const dBytes = await readImageBytes(dispUri);
      const hBytes = await readImageBytes(hideUri);
      if (dBytes.length > MAX_BYTES || hBytes.length > MAX_BYTES) throw new Error('图片文件过大，请选择小一点的图片');

      const dRaw = decodeImage(dBytes);
      const hRaw = decodeImage(hBytes);
      if (dRaw.width * dRaw.height > MAX_PIXELS || hRaw.width * hRaw.height > MAX_PIXELS)
        throw new Error('图片分辨率过高，请选择较小的图片');

      setBusy('正在对齐尺寸…');
      const [w, hh] = fitDims(dRaw.width, dRaw.height);
      const d = sampleTo(dRaw, w, hh);
      const h = sampleTo(hRaw, w, hh);

      setBusy('正在合成…');
      const out = compose(d, h);
      const set: ImageSet = { out, d, h };
      setFull(set);
      // 预览用缩略图：一次生成，后续切换/拖动只在缩略图上运算
      setThumb({
        out: downscaleTo(out, PREVIEW_SIDE),
        d: downscaleTo(d, PREVIEW_SIDE),
        h: downscaleTo(h, PREVIEW_SIDE),
      });
      setMode('composed');
      setDark(0);
    } catch (e: any) {
      setErr(readable(e));
      setFull(null);
      setThumb(null);
      setPreviewUri(null);
    } finally {
      setBusy('');
    }
  }

  async function save() {
    if (!full) return;
    setErr('');
    setSaved(false);
    setBusy('正在保存到相册…');
    try {
      await savePngToGallery(renderMode(mode, full, dark), 'prism');
      setSaved(true);
    } catch (e: any) {
      setErr('保存失败：' + readable(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <Page id="prism" title="光棱坦克图片" onBack={onBack}>
      <Card>
        <SectionTitle text="选择两张图片" style={{ marginTop: 0 }} />
        <PicSlot
          index="①"
          title="显示图"
          desc="正常看到的画面"
          icon="image"
          uri={dispUri}
          name={dispName}
          onPick={() => pick('disp')}
        />
        <View style={{ height: 10 }} />
        <PicSlot
          index="②"
          title="隐藏图"
          desc="压暗后浮现的画面"
          icon="layers"
          uri={hideUri}
          name={hideName}
          onPick={() => pick('hide')}
        />
        <Row style={{ marginTop: 14 }}>
          <Btn text="合成" icon="layers" onPress={doCompose} disabled={!dispUri || !hideUri || !!busy} />
          {full ? <Btn text="保存到相册" icon="image" kind="soft" onPress={save} disabled={!!busy} /> : null}
        </Row>
        {busy ? (
          <View style={{ marginTop: 10 }}>
            <Loading text={busy} />
          </View>
        ) : null}
        {err ? <Text style={[st.err, { color: p.warn }]}>{err}</Text> : null}
        {saved && !err ? <Text style={[st.ok, { color: p.ok }]}>已保存到相册「工具箱」</Text> : null}
      </Card>

      {thumb && full ? (
        <>
          <Card>
            <SectionTitle text="查看效果" style={{ marginTop: 0 }} />
            <Segmented options={MODES} value={mode} onChange={setMode} />
            <View style={[st.canvas, { backgroundColor: p.isDark ? '#04060a' : '#0f172a' }]}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={st.canvasImg} resizeMode="contain" />
              ) : (
                <Text style={st.canvasHint}>{gen ? '正在生成预览…' : '暂无预览'}</Text>
              )}
            </View>
            <Text style={[st.hint, { color: p.sub }]}>{MODE_HINT[mode]}</Text>
            <Slider
              label="压暗强度（调高后隐藏图浮现）"
              value={dark}
              onChange={setDark}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}%`}
              style={{ marginBottom: 2, marginTop: 6 }}
            />
          </Card>

          <Card>
            <Text style={[st.tip, { color: p.sub }]}>
              原理：合成图每像素 = √(显示图 × 隐藏图)。直接看是显示图；把截图整体调暗（压暗强度）后隐藏图会浮现。
              「还原显示图」「还原隐藏图」是用 out² ÷ 另一张图 直接数学反解，用来验证效果。保存按钮保存的是当前模式下
              的图（含当前压暗强度）。
            </Text>
          </Card>
        </>
      ) : null}
    </Page>
  );
}

/** 选图槽：已选显示缩略图与文件名，未选显示虚线占位 */
function PicSlot(props: {
  index: string;
  title: string;
  desc: string;
  icon: 'image' | 'layers';
  uri: string | null;
  name: string;
  onPick: () => void;
}) {
  const p = usePalette();
  return (
    <Tap onPress={props.onPick} style={[st.slot, { borderColor: p.cardBorder }]}>
      {props.uri ? (
        <Image source={{ uri: props.uri }} style={st.slotThumb} />
      ) : (
        <View style={[st.slotEmpty, { borderColor: p.line }]}>
          <Icon name={props.icon} size={20} color={p.faint} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[st.slotTitle, { color: p.text }]}>
          {props.index} {props.title}
        </Text>
        <Text numberOfLines={1} style={[st.slotDesc, { color: props.uri ? p.sub : p.faint }]}>
          {props.uri ? props.name : props.desc}
        </Text>
      </View>
      <Icon name={props.uri ? 'refresh' : 'plus'} size={17} color={p.primary} />
    </Tap>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    err: { fontSize: 13, marginTop: 10, lineHeight: 19 },
    ok: { fontSize: 13, marginTop: 10 },
    hint: { fontSize: 12, lineHeight: 18, marginTop: 10 },
    tip: { fontSize: 12, lineHeight: 19 },
    slot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: C.chip,
    },
    slotThumb: { width: 52, height: 52, borderRadius: 13, backgroundColor: C.track },
    slotEmpty: {
      width: 52,
      height: 52,
      borderRadius: 13,
      borderWidth: 1.4,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotTitle: { fontSize: 14, fontWeight: '600' },
    slotDesc: { fontSize: 12, marginTop: 3 },
    canvas: {
      width: '100%',
      height: 320,
      borderRadius: 16,
      marginTop: 12,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    canvasImg: { width: '100%', height: '100%' },
    canvasHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  }),
);

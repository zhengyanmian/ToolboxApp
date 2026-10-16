import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Page, Card, Btn, Row, C } from '../ui';
import {
  decodeImage,
  readImageBytes,
  savePngToGallery,
  bytesToBase64,
  RawImage,
} from '../lib/imgio';

type Mode = 'composed' | 'revealHidden' | 'revealDisplay';

const MAX_SIDE = 1100; // 限制尺寸保证手机端运算速度

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

function fitDims(w: number, h: number): [number, number] {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

/** 合成：out = sqrt(D × H)，正常看是显示图，压暗/提对比后显出隐藏图 */
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

/** 还原：out² ÷ 已知图 = 另一张图 */
function reveal(img: RawImage, known: RawImage): RawImage {
  const n = img.data.length;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    for (let c = 0; c < 3; c++) {
      const oN = img.data[i + c] / 255;
      const kN = Math.max(0.02, known.data[i + c] / 255);
      out[i + c] = Math.max(0, Math.min(255, Math.round(((oN * oN) / kN) * 255)));
    }
    out[i + 3] = 255;
  }
  return { width: img.width, height: img.height, data: out };
}

function pick(setter: (uri: string) => void) {
  launchImageLibrary({ mediaType: 'photo', quality: 1 }, (res) => {
    const uri = res.assets?.[0]?.uri;
    if (uri) setter(uri);
  });
}

export default function PrismTank({ onBack }: { onBack: () => void }) {
  const [dispUri, setDispUri] = useState<string | null>(null);
  const [hideUri, setHideUri] = useState<string | null>(null);
  const [composed, setComposed] = useState<RawImage | null>(null);
  const [dispImg, setDispImg] = useState<RawImage | null>(null);
  const [mode, setMode] = useState<Mode>('composed');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  async function encodePreview(img: RawImage) {
    const { encodePng } = await import('../lib/png');
    const png = encodePng(img);
    return 'data:image/png;base64,' + bytesToBase64(png);
  }

  async function doCompose() {
    if (!dispUri || !hideUri) return;
    setErr('');
    setBusy('正在解码两张图片…');
    try {
      const d = decodeImage(await readImageBytes(dispUri));
      const h = decodeImage(await readImageBytes(hideUri));
      setBusy('正在对齐尺寸并合成…');
      const [w, hh] = fitDims(d.width, d.height);
      const d2 = sampleTo(d, w, hh);
      const h2 = sampleTo(h, w, hh);
      const out = compose(d2, h2);
      setDispImg(d2);
      setComposed(out);
      setMode('composed');
      setPreviewUri(await encodePreview(out));
    } catch (e: any) {
      setErr(e?.message || '合成失败，请确认两张图都是 JPG/PNG');
    } finally {
      setBusy('');
    }
  }

  async function switchMode(m: Mode) {
    if (!composed || !dispImg) return;
    setMode(m);
    setBusy('正在生成预览…');
    try {
      const img = m === 'composed' ? composed : reveal(composed, dispImg);
      setPreviewUri(await encodePreview(img));
    } catch (e: any) {
      setErr(e?.message || '预览失败');
    } finally {
      setBusy('');
    }
  }

  async function save() {
    if (!composed) return;
    setErr('');
    setBusy('正在保存到相册…');
    try {
      await savePngToGallery(composed, 'prism');
      setSaved(true);
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <Page id="prism" title="光棱坦克图片" onBack={onBack}>
      <Card>
        <Text style={st.label}>① 显示图（正常看到的）</Text>
        <Row>
          <Btn text="选择图片" onPress={() => pick(setDispUri)} />
          {dispUri && <Image source={{ uri: dispUri }} style={st.thumb} />}
        </Row>
        <Text style={[st.label, { marginTop: 12 }]}>② 隐藏图（压暗后出现的）</Text>
        <Row>
          <Btn text="选择图片" onPress={() => pick(setHideUri)} />
          {hideUri && <Image source={{ uri: hideUri }} style={st.thumb} />}
        </Row>
        <Row style={{ marginTop: 14 }}>
          <Btn text="合成" kind="primary" onPress={doCompose} />
          {composed && <Btn text="保存到相册" onPress={save} />}
        </Row>
        {busy ? (
          <Row style={{ marginTop: 10 }}>
            <ActivityIndicator color={C.primary} />
            <Text style={st.busy}>{busy}</Text>
          </Row>
        ) : null}
        {err ? <Text style={st.err}>{err}</Text> : null}
        {saved && !err ? <Text style={st.ok}>已保存到相册「工具箱」</Text> : null}
      </Card>

      {composed && (
        <Card>
          <Row>
            <Btn
              text="合成图"
              kind={mode === 'composed' ? 'primary' : 'plain'}
              onPress={() => switchMode('composed')}
            />
            <Btn
              text="还原显示图"
              kind={mode === 'revealDisplay' ? 'primary' : 'plain'}
              onPress={() => switchMode('revealDisplay')}
            />
            <Btn
              text="还原隐藏图"
              kind={mode === 'revealHidden' ? 'primary' : 'plain'}
              onPress={() => switchMode('revealHidden')}
            />
          </Row>
          {previewUri && (
            <Image source={{ uri: previewUri }} style={st.preview} resizeMode="contain" />
          )}
          <Text style={st.tip}>
            原理：合成图每像素 = √(显示 × 隐藏)。直接看是显示图；把截图亮度调低、对比度拉高（或任何图片编辑器里做暗化处理），隐藏图就会浮现。App 内的"还原隐藏图"是直接数学反解，用来验证效果。
          </Text>
        </Card>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: C.line },
  preview: {
    width: '100%',
    height: 300,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  busy: { color: C.sub, fontSize: 13, marginLeft: 8 },
  err: { color: C.warn, fontSize: 13, marginTop: 10 },
  ok: { color: C.ok, fontSize: 13, marginTop: 10 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 19, marginTop: 10 },
});

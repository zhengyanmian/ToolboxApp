import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Page, Card, Btn, Row, C, dynStyles} from '../ui';

type Fmt = 'JPEG' | 'PNG' | 'WEBP';
const WIDTHS = [0, 1920, 1080, 720, 480]; // 0 = 原尺寸
const QUALITIES = [100, 85, 70, 50, 30];

function fmtSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ImageCompress({ onBack }: { onBack: () => void }) {
  const [src, setSrc] = useState<{ uri: string; size?: number; width?: number; height?: number } | null>(null);
  const [maxW, setMaxW] = useState(1080);
  const [quality, setQuality] = useState(70);
  const [fmt, setFmt] = useState<Fmt>('JPEG');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ uri: string; size: number; width: number; height: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const pick = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, (res) => {
      const a = res.assets?.[0];
      if (a) {
        setSrc({ uri: a.uri || '', size: a.fileSize, width: a.width, height: a.height });
        setOut(null);
        setMsg('');
        setSaved(false);
      }
    });
  };

  // 选项或图片变化 → 实时压缩预览（防抖 500ms）
  const estimate = useCallback(async () => {
    if (!src?.uri) return;
    setBusy(true);
    try {
      const r = await ImageResizer.createResizedImage(
        src.uri,
        maxW || src.width || 4096,
        maxW || src.height || 4096,
        fmt,
        quality,
        0,
        undefined,
        undefined,
        { mode: 'contain', onlyScaleDown: maxW !== 0 },
      );
      setOut({ uri: r.uri, size: r.size, width: r.width, height: r.height });
    } catch (e: any) {
      setMsg('处理失败：' + (e?.message || '未知错误'));
    } finally {
      setBusy(false);
    }
  }, [src, maxW, quality, fmt]);

  useEffect(() => {
    if (!src) return;
    const t = setTimeout(estimate, 500);
    return () => clearTimeout(t);
  }, [estimate]);

  const save = async () => {
    if (!out) return;
    try {
      await CameraRoll.save(out.uri, { type: 'photo', album: '工具箱' });
      setMsg('已保存到相册「工具箱」');
      setSaved(true);
    } catch (e: any) {
      setMsg('保存失败：' + (e?.message || '请确认已授予相册权限'));
    }
  };

  const delta =
    out && src?.size
      ? Math.round((1 - out.size / src.size) * 100)
      : null;

  return (
    <Page id="imgcompress" title="图片压缩 / 格式转换" onBack={onBack}>
      <Card>
        <Btn text={src ? '重新选图' : '从相册选图'} onPress={pick} />
        {src && (
          <>
            <Image source={{ uri: out?.uri || src.uri }} style={st.preview} resizeMode="contain" />
            <Text style={st.meta}>
              原图 {fmtSize(src.size)} · {src.width}×{src.height}
            </Text>
          </>
        )}
      </Card>

      {src && (
        <>
          <Card>
            <Text style={st.label}>最长边</Text>
            <Row>
              {WIDTHS.map((w) => (
                <Btn key={w} text={w === 0 ? '原图' : String(w)} kind={maxW === w ? 'primary' : 'plain'} onPress={() => setMaxW(w)} style={{ flex: 1 }} />
              ))}
            </Row>
            <Text style={[st.label, { marginTop: 12 }]}>质量（仅 JPEG/WEBP 生效）</Text>
            <Row>
              {QUALITIES.map((q) => (
                <Btn key={q} text={`${q}`} kind={quality === q ? 'primary' : 'plain'} onPress={() => setQuality(q)} style={{ flex: 1 }} />
              ))}
            </Row>
            <Text style={[st.label, { marginTop: 12 }]}>输出格式</Text>
            <Row>
              {(['JPEG', 'PNG', 'WEBP'] as Fmt[]).map((f) => (
                <Btn key={f} text={f} kind={fmt === f ? 'primary' : 'plain'} onPress={() => setFmt(f)} style={{ flex: 1 }} />
              ))}
            </Row>
          </Card>

          {/* 实时输出大小 */}
          <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
            {busy ? (
              <Text style={st.estimating}>计算中…</Text>
            ) : out ? (
              <>
                <Text style={st.estLabel}>预计输出大小</Text>
                <Text style={st.estValue}>{fmtSize(out.size)}</Text>
                <Text style={st.estMeta}>
                  {out.width}×{out.height}
                  {delta !== null && delta >= 0 ? ` · 比原图省 ${delta}%` : delta !== null ? ` · 比原图大 ${-delta}%` : ''}
                </Text>
              </>
            ) : null}
          </Card>

          <Row>
            <Btn text={busy ? '计算中…' : '保存到相册'} onPress={save} />
          </Row>
          {msg ? <Text style={st.msg}>{msg}</Text> : null}
        </>
      )}

      <Card style={{ marginTop: 12 }}>
        <Text style={st.tip}>
          切换任何参数都会实时重新编码并显示输出大小（真实计算而非估算）。发朋友圈/传群前把大图压到 1080 + 85，体积通常减 70% 以上。JPEG 有损适合照片；PNG 无损适合截图文字；WEBP 体积最小。结果保存在相册「工具箱」。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  preview: { width: '100%', height: 200, marginTop: 12, borderRadius: 8, backgroundColor: '#00000010' },
  meta: { fontSize: 12, color: C.sub, marginTop: 8, textAlign: 'center' },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  msg: { fontSize: 13, color: C.ok, textAlign: 'center', marginTop: 10 },
  estLabel: { fontSize: 13, color: C.sub },
  estValue: { fontSize: 34, fontWeight: '800', color: C.primary, marginTop: 4, fontVariant: ['tabular-nums'] },
  estMeta: { fontSize: 12, color: C.sub, marginTop: 4 },
  estimating: { fontSize: 15, color: C.sub },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

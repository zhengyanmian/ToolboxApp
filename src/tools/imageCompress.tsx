import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Page, Card, Btn, Row, C } from '../ui';

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

  const pick = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, (res) => {
      const a = res.assets?.[0];
      if (a) {
        setSrc({ uri: a.uri || '', size: a.fileSize, width: a.width, height: a.height });
        setOut(null);
        setMsg('');
      }
    });
  };

  const run = async () => {
    if (!src?.uri || busy) return;
    setBusy(true);
    setMsg('');
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
  };

  const save = async () => {
    if (!out) return;
    try {
      await CameraRoll.save(out.uri, { type: 'photo', album: '工具箱' });
      setMsg('已保存到相册「工具箱」');
    } catch (e: any) {
      setMsg('保存失败：' + (e?.message || '请确认已授予相册权限'));
    }
  };

  const saved = out && src?.size ? Math.max(0, Math.round((1 - out.size / src.size) * 100)) : null;

  return (
    <Page id="imgcompress" title="图片压缩 / 格式转换" onBack={onBack}>
      <Card>
        <Btn text={src ? '重新选图' : '从相册选图'} onPress={pick} />
        {src && (
          <>
            <Image source={{ uri: src.uri }} style={st.preview} resizeMode="contain" />
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

          <Btn text={busy ? '处理中…' : '开始处理'} onPress={run} />
          {msg ? <Text style={st.msg}>{msg}</Text> : null}

          {out && (
            <Card style={{ marginTop: 12 }}>
              <Image source={{ uri: out.uri }} style={st.preview} resizeMode="contain" />
              <Text style={st.meta}>
                结果 {fmtSize(out.size)} · {out.width}×{out.height}
                {saved !== null ? ` · 比原图省 ${saved}%` : ''}
              </Text>
              <Row>
                <Btn text="保存到相册" onPress={save} />
              </Row>
            </Card>
          )}
        </>
      )}

      <Card style={{ marginTop: 12 }}>
        <ScrollView>
          <Text style={st.tip}>
            选图后按目标尺寸、质量和格式重新编码：发朋友圈/传群前把大图压到 1080+85 通常体积减 70% 以上。JPEG 有损适合照片；PNG 无损适合截图和文字；WEBP 体积最小，新系统都支持。结果保存在相册「工具箱」。
          </Text>
        </ScrollView>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  preview: { width: '100%', height: 200, marginTop: 12, borderRadius: 8, backgroundColor: '#00000010' },
  meta: { fontSize: 12, color: C.sub, marginTop: 8, textAlign: 'center' },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  msg: { fontSize: 13, color: C.ok, textAlign: 'center', marginTop: 10 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

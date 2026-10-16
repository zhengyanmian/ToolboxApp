import React, { useState } from 'react';
import { Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Page, Card, Btn, Row, C } from '../ui';
import { getWallpaper } from '../native';

export default function WallpaperTool({ onBack }: { onBack: () => void }) {
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  const fetchWallpaper = async () => {
    setErr('');
    setSaved(false);
    setBusy(true);
    try {
      const p = await getWallpaper();
      setPath(p.startsWith('file://') ? p : 'file://' + p);
    } catch (e: any) {
      setErr(e?.message || '获取失败');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!path) return;
    setBusy(true);
    setErr('');
    try {
      await CameraRoll.save(path.replace('file://', ''), { type: 'photo', album: '工具箱' });
      setSaved(true);
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="wallpaper" title="当前壁纸" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="获取当前壁纸" kind="primary" onPress={fetchWallpaper} />
          {busy && <ActivityIndicator color={C.primary} />}
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {path && (
        <Card>
          <Image source={{ uri: path }} style={st.img} resizeMode="contain" />
          <Row style={{ marginTop: 10 }}>
            <Btn text="保存到相册" onPress={save} />
            {saved && <Text style={st.ok}>已保存 ✓</Text>}
          </Row>
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          读取系统当前桌面壁纸（JPEG 输出）。部分定制系统（MIUI/鸿蒙等）限制了壁纸读取时会失败——这是系统权限限制，不是 bug。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  img: { width: '100%', height: 260, borderRadius: 10, backgroundColor: '#000' },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
  ok: { color: C.ok, fontSize: 13, marginLeft: 8, alignSelf: 'center' },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

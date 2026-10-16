import React, { useState } from 'react';
import { Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Page, Card, Btn, Row, Result, C } from '../ui';
import { readImageBytes, bytesToBase64 } from '../lib/imgio';

export default function ImgToBase64({ onBack }: { onBack: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [b64, setB64] = useState('');
  const [sizeKB, setSizeKB] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1, includeBase64: false }, (res) => {
      const u = res.assets?.[0]?.uri;
      if (!u) return;
      setUri(u);
      setB64('');
      setErr('');
      setBusy(true);
      readImageBytes(u)
        .then((bytes) => {
          setSizeKB(Math.round(bytes.length / 102.4) / 10);
          setB64(bytesToBase64(bytes));
        })
        .catch((e) => setErr(e?.message || '读取失败'))
        .finally(() => setBusy(false));
    });
  };

  return (
    <Page id="imgb64" title="图片转 Base64" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="选择图片" kind="primary" onPress={pick} />
          {busy && <ActivityIndicator color={C.primary} />}
        </Row>
        {uri && (
          <>
            <Image source={{ uri }} style={st.prev} resizeMode="contain" />
            <Text style={st.meta}>原始大小 {sizeKB} KB · Base64 长度 {b64.length.toLocaleString()} 字符（比原图大约 33%）</Text>
          </>
        )}
        {b64 ? (
          <>
            <Result label="Data URI（网页/CSS 直接可用）" value={'data:image/jpeg;base64,' + b64.slice(0, 96) + '…'} />
            <Text style={st.tip}>
              完整 Base64 已生成（{b64.length.toLocaleString()} 字符）。点上方结果卡的复制可分享完整内容；超大图片建议先压缩再转码。
            </Text>
          </>
        ) : null}
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  prev: { width: '100%', height: 180, borderRadius: 10, marginTop: 12, backgroundColor: '#000' },
  meta: { fontSize: 12, color: C.sub, marginTop: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
});

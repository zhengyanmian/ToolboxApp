import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Page, Card, Btn, Row, C, Result, dynStyles} from '../ui';
import { decodeImage, readImageBytes, bytesToBase64, RawImage } from '../lib/imgio';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export default function ColorPicker({ onBack }: { onBack: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const [img, setImg] = useState<RawImage | null>(null);
  const [disp, setDisp] = useState<{ w: number; h: number } | null>(null);
  const [picked, setPicked] = useState<{ r: number; g: number; b: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, (res) => {
      const u = res.assets?.[0]?.uri;
      if (!u) return;
      setUri(u);
      setPicked(null);
      setErr('');
      setBusy(true);
      readImageBytes(u)
        .then((bytes) => {
          let d = decodeImage(bytes);
          // 限制解码尺寸，避免大图爆内存：按比例抽样到最长边 1200
          const maxSide = Math.max(d.width, d.height);
          if (maxSide > 1200) {
            const k = 1200 / maxSide;
            const w = Math.round(d.width * k);
            const h = Math.round(d.height * k);
            const out = new Uint8Array(w * h * 4);
            for (let y = 0; y < h; y++) {
              const sy = Math.floor((y / h) * d.height);
              for (let x = 0; x < w; x++) {
                const sx = Math.floor((x / w) * d.width);
                const si = (sy * d.width + sx) * 4;
                const di = (y * w + x) * 4;
                out[di] = d.data[si];
                out[di + 1] = d.data[si + 1];
                out[di + 2] = d.data[si + 2];
                out[di + 3] = 255;
              }
            }
            d = { width: w, height: h, data: out };
          }
          setImg(d);
        })
        .catch((e) => setErr(e?.message || '解码失败'))
        .finally(() => setBusy(false));
    });
  };

  const onTap = (e: any) => {
    if (!img || !disp) return;
    const { locationX, locationY } = e.nativeEvent;
    const x = Math.min(img.width - 1, Math.max(0, Math.floor((locationX / disp.w) * img.width)));
    const y = Math.min(img.height - 1, Math.max(0, Math.floor((locationY / disp.h) * img.height)));
    const i = (y * img.width + x) * 4;
    setPicked({ r: img.data[i], g: img.data[i + 1], b: img.data[i + 2] });
  };

  const hex = picked ? rgbToHex(picked.r, picked.g, picked.b) : '';

  return (
    <Page id="picker" title="取色器" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="选择图片" kind="primary" onPress={pick} />
          {busy && <ActivityIndicator color={C.primary} />}
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {img && uri && (
        <Card>
          <Text style={st.tip}>点击图片上任意位置取色：</Text>
          <Image
            source={{ uri }}
            style={[st.img, { aspectRatio: img.width / img.height }]}
            resizeMode="stretch"
            onLayout={(e) =>
              setDisp({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
            }
            onStartShouldSetResponder={() => true}
            onResponderRelease={onTap}
          />
        </Card>
      )}
      {picked && (
        <Card>
          <Row style={{ alignItems: 'center' }}>
            <View style={[st.swatch, { backgroundColor: hex }]} />
            <View style={{ flex: 1 }}>
              <Result label="HEX" value={hex} copyable />
              <Result label="RGB" value={`rgb(${picked.r}, ${picked.g}, ${picked.b})`} copyable />
            </View>
          </Row>
        </Card>
      )}
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  img: { width: '100%', borderRadius: 8, marginTop: 8, backgroundColor: '#000' },
  tip: { fontSize: 13, color: C.text },
  swatch: { width: 64, height: 64, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: C.line },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
}));;

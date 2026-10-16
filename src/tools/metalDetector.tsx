import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { Page, Card, C } from '../ui';

function label(uT: number): { text: string; color: string } {
  if (uT < 45) return { text: '环境正常', color: C.ok };
  if (uT < 70) return { text: '地磁波动', color: '#eab308' };
  if (uT < 120) return { text: '疑似金属靠近', color: '#f97316' };
  return { text: '金属信号强', color: C.warn };
}

export default function MetalDetector({ onBack }: { onBack: () => void }) {
  const [uT, setUT] = useState<number | null>(null);
  const [error, setError] = useState('');
  const lastVibe = useRef(0);

  useEffect(() => {
    let sub: any = null;
    try {
      setUpdateIntervalForType(SensorTypes.magnetometer, 150);
      sub = magnetometer.subscribe({
        next: ({ x, y, z }) => {
          const m = Math.sqrt(x * x + y * y + z * z);
          setUT(m);
          if (m > 100 && Date.now() - lastVibe.current > 1500) {
            lastVibe.current = Date.now();
            Vibration.vibrate(120);
          }
        },
        error: () => setError('传感器读取失败：设备可能没有磁力计'),
      });
    } catch {
      setError('此设备不支持磁力计传感器');
    }
    return () => sub?.unsubscribe?.();
  }, []);

  const pct = uT === null ? 0 : Math.min(100, (uT / 200) * 100);
  const lv = uT === null ? null : label(uT);

  return (
    <Page id="metal" title="金属探测仪" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
        {error ? (
          <Text style={st.err}>{error}</Text>
        ) : (
          <>
            <Text style={[st.value, { color: lv!.color }]}>{uT!.toFixed(1)}</Text>
            <Text style={st.unit}>µT（微特斯拉）</Text>
            <View style={st.barBg}>
              <View style={[st.bar, { width: `${pct}%` as `${number}%`, backgroundColor: lv!.color }]} />
            </View>
            <Text style={[st.level, { color: lv!.color }]}>{lv!.text}</Text>
            <Text style={st.scale}>| 0 ——— 70 ——— 120 ——— 200 µT |</Text>
          </>
        )}
      </Card>
      <Card>
        <Text style={st.tip}>
          原理：手机磁力计（指南针传感器）测量环境磁场强度。地球磁场约 25~65 µT 且相对稳定；铁磁金属（铁、钴、镍）靠近会使读数明显升高，超过 100 µT 会震动提醒。
        </Text>
        <Text style={st.tip2}>
          使用技巧：远离磁铁、音箱、充电器和手机壳磁扣做基准；探测时缓慢扫过目标物，看读数跳变而不是绝对值。超过 200 µT 可能是强磁体。此工具不能替代专业金属探测器，也无法探测非磁性金属（铝、铜）。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  value: { fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, color: C.sub, marginTop: 4 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: C.line, alignSelf: 'stretch', marginTop: 20, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
  level: { fontSize: 18, fontWeight: '700', marginTop: 14 },
  scale: { fontSize: 10, color: C.sub, marginTop: 6 },
  err: { color: C.warn, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Btn, C } from '../ui';
import { startNoise, getNoiseAmplitude, stopNoise } from '../native';

export default function NoiseMeter({ onBack }: { onBack: () => void }) {
  const [db, setDb] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const peak = useRef(0);
  const [peakDb, setPeakDb] = useState(0);

  const begin = async () => {
    const e = await startNoise();
    if (e) {
      setErr(e);
      return;
    }
    setErr('');
    setRunning(true);
    peak.current = 0;
    timer.current = setInterval(async () => {
      const amp = await getNoiseAmplitude();
      if (amp < 0) return;
      const dbv = Math.max(30, Math.min(110, 20 * Math.log10(amp / 32767) + 100));
      const rounded = Math.round(dbv);
      setDb(rounded);
      if (rounded > peak.current) {
        peak.current = rounded;
        setPeakDb(rounded);
      }
    }, 300);
  };

  const end = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stopNoise();
    setRunning(false);
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      stopNoise();
    },
    [],
  );

  const pct = db === null ? 0 : Math.min(100, ((db - 30) / 80) * 100);
  const desc =
    db === null
      ? ''
      : db < 40
      ? '图书馆级安静'
      : db < 60
      ? '正常交谈'
      : db < 75
      ? '比较吵闹'
      : db < 90
      ? '很吵，久了伤听力'
      : '噪音危害级！快离开';

  return (
    <Page id="noise" title="噪音检测" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        {err ? (
          <>
            <Text style={st.err}>{err}</Text>
            <Btn text="重试" kind="primary" onPress={begin} />
          </>
        ) : (
          <>
            <Text style={st.value}>{db === null ? '--' : db}</Text>
            <Text style={st.unit}>分贝（dB，估算值）</Text>
            <View style={st.barBg}>
              <View style={[st.bar, { width: `${pct}%` as `${number}%` }]} />
            </View>
            <Text style={st.desc}>{desc || '点击下方按钮开始测量'}</Text>
            <Text style={st.peak}>峰值 {peakDb || '--'} dB</Text>
            <Btn
              text={running ? '停止测量' : '开始测量'}
              kind="primary"
              onPress={running ? end : begin}
            />
          </>
        )}
      </Card>
      <Card>
        <Text style={st.tip}>
          用麦克风振幅估算声压级（±5dB 级别误差，非专业计量）。未授予麦克风权限无法使用；测量时不会被录音或保存。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  value: { fontSize: 62, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] as any },
  unit: { fontSize: 13, color: C.sub, marginTop: 2 },
  barBg: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: 6,
    backgroundColor: C.line,
    marginTop: 18,
    overflow: 'hidden',
  },
  bar: { height: 12, backgroundColor: '#f59e0b', borderRadius: 6 },
  desc: { fontSize: 15, fontWeight: '600', color: C.text, marginTop: 12 },
  peak: { fontSize: 12, color: C.sub, marginTop: 4, marginBottom: 12 },
  err: { color: C.warn, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

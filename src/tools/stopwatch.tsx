import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';

function fmt(ms: number): string {
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return h > 0 ? `${h}:${p(m)}:${p(s)}.${p(cs)}` : `${p(m)}:${p(s)}.${p(cs)}`;
}

export default function Stopwatch({ onBack }: { onBack: () => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const t = setInterval(() => setElapsed(baseRef.current + (Date.now() - startRef.current)), 33);
    return () => clearInterval(t);
  }, [running]);

  const toggle = () => {
    if (running) {
      baseRef.current += Date.now() - startRef.current;
      setRunning(false);
    } else {
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
  };

  const lap = () => {
    if (!running) return;
    setLaps((l) => [...l, elapsed]);
  };

  return (
    <Page id="stopwatch" title="秒表" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={st.time}>{fmt(elapsed)}</Text>
        {laps.length > 0 && (
          <Text style={st.lapHint}>共 {laps.length} 次计次</Text>
        )}
      </Card>
      <Row>
        <Btn text={running ? '暂停' : elapsed > 0 ? '继续' : '开始'} onPress={toggle} />
        <Btn text="计次" onPress={lap} kind="plain" />
        <Btn text="重置" onPress={reset} kind="plain" />
      </Row>
      {laps.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          {[...laps].reverse().map((l, i) => {
            const idx = laps.length - i;
            const prev = idx > 1 ? laps[idx - 2] : 0;
            return (
              <View key={idx} style={st.lapRow}>
                <Text style={st.lapNo}>#{idx}</Text>
                <Text style={st.lapSplit}>+{fmt(l - prev)}</Text>
                <Text style={st.lapTotal}>{fmt(l)}</Text>
              </View>
            );
          })}
        </Card>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  time: { fontSize: 44, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  lapHint: { fontSize: 12, color: C.sub, marginTop: 6 },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  lapNo: { width: 40, color: C.sub, fontSize: 14 },
  lapSplit: { flex: 1, color: C.primary, fontSize: 14, textAlign: 'center' },
  lapTotal: { width: 110, color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'right' },
});

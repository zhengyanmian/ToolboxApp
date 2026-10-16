import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';

type State = 'idle' | 'waiting' | 'go' | 'early' | 'done';

export default function ReactionTest({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<State>('idle');
  const [ms, setMs] = useState(0);
  const [records, setRecords] = useState<number[]>([]);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const arm = () => {
    setState('waiting');
    timer.current = setTimeout(() => {
      goAt.current = Date.now();
      setState('go');
    }, 1200 + Math.random() * 2800);
  };

  const tap = () => {
    if (state === 'idle' || state === 'early' || state === 'done') {
      arm();
    } else if (state === 'waiting') {
      if (timer.current) clearTimeout(timer.current);
      setState('early');
    } else if (state === 'go') {
      const d = Date.now() - goAt.current;
      setMs(d);
      setRecords((r) => [d, ...r].slice(0, 5));
      setState('done');
    }
  };

  const bg =
    state === 'go' ? '#16a34a' : state === 'waiting' ? '#b91c1c' : state === 'early' ? '#f59e0b' : '#0f172a';
  const label =
    state === 'idle'
      ? '点击开始'
      : state === 'waiting'
      ? '等待变绿…'
      : state === 'go'
      ? '点！'
      : state === 'early'
      ? '抢跑了，点此重来'
      : `${ms} ms · 点此再来`;

  const best = records.length ? Math.min(...records) : null;
  const avg = records.length ? Math.round(records.reduce((a, b) => a + b, 0) / records.length) : null;

  return (
    <Page id="reaction" title="反应力测试" onBack={onBack}>
      <TouchableOpacity style={[st.area, { backgroundColor: bg }]} onPress={tap} activeOpacity={0.85}>
        <Text style={st.label}>{label}</Text>
        {state === 'waiting' && <Text style={st.sub}>手放好，别抢跑</Text>}
      </TouchableOpacity>
      <Card>
        <Text style={st.tip}>
          屏幕变红的瞬间不要点，变绿的瞬间立刻点。人的平均视觉反应约 200~300 毫秒，低于 200 属于电竞选手水平。
        </Text>
        <View style={st.row}>
          <Text style={st.stat}>最佳：<Text style={st.num}>{best ?? '--'}</Text> ms</Text>
          <Text style={st.stat}>近5次均值：<Text style={st.num}>{avg ?? '--'}</Text> ms</Text>
        </View>
        <Row style={{ marginTop: 8 }}>
          {records.map((r, i) => (
            <Text key={i} style={st.rec}>{r}</Text>
          ))}
          {records.length > 0 && <Btn text="清空" onPress={() => setRecords([])} />}
        </Row>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  area: { borderRadius: 16, height: 220, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 26, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 18, marginTop: 10 },
  stat: { fontSize: 13, color: C.text },
  num: { fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },
  rec: { color: C.sub, fontSize: 12, alignSelf: 'center', marginRight: 6 },
});

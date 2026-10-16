import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Btn, C } from '../ui';

type Dot = { id: number; x: number; y: number };
let uid = 1;

export default function FingerRoulette({ onBack }: { onBack: () => void }) {
  const [dots, setDots] = useState<Dot[]>([]);
  const [winner, setWinner] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  const sync = (touches: readonly any[]) => {
    const list: Dot[] = touches.map((t: any) => ({ id: t.identifier ?? uid++, x: t.locationX, y: t.locationY }));
    setDots(list);
    if (list.length !== dots.length) setWinner(null);
  };

  const start = () => {
    if (dots.length < 2) return;
    setWinner(dots[Math.floor(Math.random() * dots.length)].id);
    setCount((c) => c + 1);
  };

  return (
    <Page id="finger" title="指尖转" onBack={onBack}>
      <Card>
        <Text style={st.tip}>
          所有人各按住一根手指不放，然后点「开抽」——随机亮出一个幸运儿。松手即重置。
        </Text>
        <View style={st.hintRow}>
          <Text style={st.hint}>当前按住：<Text style={st.num}>{dots.length}</Text> 根手指</Text>
          <Text style={st.hint}>已抽：<Text style={st.num}>{count}</Text> 次</Text>
        </View>
        <Btn
          text="开抽！"
          kind="primary"
          onPress={start}
          style={{ opacity: dots.length >= 2 ? 1 : 0.4 }}
        />
      </Card>
      <View
        style={st.area}
        onTouchStart={(e) => sync(e.nativeEvent.touches)}
        onTouchMove={(e) => sync(e.nativeEvent.touches)}
        onTouchEnd={(e) => {
          sync(e.nativeEvent.touches);
          if (e.nativeEvent.touches.length === 0) {
            setDots([]);
            setWinner(null);
          }
        }}>
        {dots.length === 0 && <Text style={st.empty}>手指按在这里 ↓</Text>}
        {dots.map((d) => (
          <View
            key={d.id}
            style={[
              st.dot,
              { left: d.x - 26, top: d.y - 26 },
              winner !== null && (winner === d.id ? st.dotWin : st.dotLose),
            ]}>
            <Text style={st.dotText}>{winner === d.id ? '中!' : ''}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

const st = StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  hintRow: { flexDirection: 'row', gap: 18, marginTop: 8, marginBottom: 10 },
  hint: { fontSize: 13, color: C.text },
  num: { fontWeight: '800', color: C.primary },
  area: {
    height: 340,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: { color: C.sub, fontSize: 15 },
  dot: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#93c5fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotWin: { backgroundColor: '#facc15', transform: [{ scale: 1.25 }] },
  dotLose: { backgroundColor: '#e5e7eb', opacity: 0.35 },
  dotText: { fontSize: 16, fontWeight: '800', color: '#7c2d12' },
});

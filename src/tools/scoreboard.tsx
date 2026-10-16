import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Page, Card, Btn, Row, Field, C, dynStyles} from '../ui';

type P = { name: string; score: number };
const KEY = 'scoreboard_v1';

export default function Scoreboard({ onBack }: { onBack: () => void }) {
  const [players, setPlayers] = useState<P[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setPlayers(JSON.parse(v)))
      .catch(() => {});
  }, []);
  const persist = (list: P[]) => {
    setPlayers(list);
    AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  };

  const change = (i: number, d: number) =>
    persist(players.map((p, j) => (j === i ? { ...p, score: p.score + d } : p)));
  const remove = (i: number) => persist(players.filter((_, j) => j !== i));

  return (
    <Page id="score" title="计分板" onBack={onBack}>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Field value={name} onChange={setName} placeholder="玩家名" />
          </View>
          <Btn
            text="添加"
            kind="primary"
            onPress={() => {
              const n = name.trim();
              if (!n) return;
              persist([...players, { name: n, score: 0 }]);
              setName('');
            }}
          />
        </Row>
        {players.length > 0 && (
          <Row style={{ marginTop: 10 }}>
            <Btn text="全部清零" onPress={() => persist(players.map((p) => ({ ...p, score: 0 })))} />
            <Btn text="清空玩家" onPress={() => persist([])} />
          </Row>
        )}
      </Card>
      {players.map((p, i) => (
        <Card key={i} style={{ paddingVertical: 10 }}>
          <View style={st.row}>
            <Text style={st.name} numberOfLines={1}>{p.name}</Text>
            <Text style={st.score}>{p.score}</Text>
          </View>
          <Row style={{ marginTop: 8 }}>
            <Btn text="−5" onPress={() => change(i, -5)} style={{ flex: 1 }} />
            <Btn text="−1" onPress={() => change(i, -1)} style={{ flex: 1 }} />
            <Btn text="+1" kind="primary" onPress={() => change(i, 1)} style={{ flex: 1 }} />
            <Btn text="+5" onPress={() => change(i, 5)} style={{ flex: 1 }} />
            <Btn text="删" onPress={() => remove(i)} style={{ flex: 0.7 }} />
          </Row>
        </Card>
      ))}
      {players.length === 0 && <Text style={st.empty}>还没有玩家，先添加一个吧</Text>}
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },
  score: { fontSize: 26, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', color: C.sub, marginTop: 30 },
}));;

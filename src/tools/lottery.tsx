import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Page, Card, Field, Btn, Row, C } from '../ui';

export default function Lottery({ onBack }: { onBack: () => void }) {
  const [diceCount, setDiceCount] = useState('1');
  const [diceFaces, setDiceFaces] = useState('6');
  const [dice, setDice] = useState<number[]>([]);
  const [coin, setCoin] = useState<string[]>([]);
  const [names, setNames] = useState('张三\n李四\n王五\n赵六');
  const [drawn, setDrawn] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupCount, setGroupCount] = useState('2');

  const roll = () => {
    const n = clamp(parseInt(diceCount, 10) || 1, 1, 10);
    const f = clamp(parseInt(diceFaces, 10) || 6, 2, 100);
    setDice(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * f)));
  };

  const flip = () => {
    const n = clamp(dice.length || 1, 1, 10);
    setCoin(Array.from({ length: n }, () => (Math.random() < 0.5 ? '正面' : '反面')));
  };

  const drawOne = () => {
    const list = names.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!list.length) return;
    setDrawn((d) => [...d, list[Math.floor(Math.random() * list.length)]]);
  };

  const drawGroups = () => {
    const list = names.split('\n').map((s) => s.trim()).filter(Boolean);
    const g = clamp(parseInt(groupCount, 10) || 2, 1, 20);
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const out: string[][] = Array.from({ length: g }, () => []);
    shuffled.forEach((name, i) => out[i % g].push(name));
    setGroups(out);
  };

  return (
    <Page id="lottery" title="骰子 / 抽签 / 分组" onBack={onBack}>
      <Card>
        <Text style={st.title}>🎲 掷骰子</Text>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="数量" value={diceCount} onChange={setDiceCount} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="面数" value={diceFaces} onChange={setDiceFaces} keyboardType="numbers-and-punctuation" />
          </View>
        </Row>
        <Btn text="掷！" onPress={roll} />
        {dice.length > 0 && (
          <Text style={st.big}>{dice.join(' · ')}</Text>
        )}
      </Card>

      <Card>
        <Text style={st.title}>🪙 抛硬币</Text>
        <Btn text="抛！" onPress={flip} kind="plain" />
        {coin.length > 0 && <Text style={st.big}>{coin.join(' · ')}</Text>}
      </Card>

      <Card>
        <Text style={st.title}>🎯 抽签 / 分组</Text>
        <Field
          label="名单（每行一个）"
          value={names}
          onChange={setNames}
          multiline
        />
        <Row>
          <Btn text="抽一人" onPress={drawOne} kind="plain" />
          <View style={{ flex: 1 }}>
            <Field value={groupCount} onChange={setGroupCount} keyboardType="numbers-and-punctuation" placeholder="组数" />
          </View>
          <Btn text="随机分组" onPress={drawGroups} kind="plain" />
        </Row>
        {drawn.length > 0 && (
          <Text style={st.drawn}>已抽出：{drawn.join('、')}</Text>
        )}
        {groups.map((g, i) => (
          <Text key={i} style={st.group}>第 {i + 1} 组：{g.join('、') || '空'}</Text>
        ))}
      </Card>
    </Page>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const st = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  big: { fontSize: 30, fontWeight: '700', color: C.primary, textAlign: 'center', marginTop: 12 },
  drawn: { fontSize: 14, color: C.ok, marginTop: 8, lineHeight: 20 },
  group: { fontSize: 14, color: C.text, marginTop: 8, lineHeight: 20 },
});

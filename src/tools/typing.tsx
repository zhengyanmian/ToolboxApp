import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';

const PARAS = [
  '工具的价值在于解决真实的重复劳动，而不是堆砌看起来很多的功能按钮。',
  '凡是过往，皆为序章。凡是未来，皆有回响，认真做好眼前的事即可。',
  '山不在高，有仙则名。水不在深，有龙则灵。斯是陋室，惟吾德馨。',
  '在快速变化的时代，保持学习和思考的习惯，比记住任何一个具体结论都重要。',
  '把复杂的事情做简单，把简单的事情做到极致，这本身就是一种了不起的能力。',
];

function sample(arr: string[], exclude: number): number {
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1) while (i === exclude) i = Math.floor(Math.random() * arr.length);
  return i;
}

export default function Typing({ onBack }: { onBack: () => void }) {
  const [target, setTarget] = useState(() => PARAS[0]);
  const targetIdx = useRef(0);
  const [input, setInput] = useState('');
  const [startAt, setStartAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const done = input.length >= target.length;

  const pick = () => {
    const i = sample(PARAS, targetIdx.current);
    targetIdx.current = i;
    setTarget(PARAS[i]);
    setInput('');
    setStartAt(null);
    setElapsed(0);
  };

  const onChange = (v: string) => {
    if (startAt === null && !done) setStartAt(Date.now());
    setInput(v);
    if (startAt !== null && v.length >= target.length && elapsed === 0) {
      const sec = (Date.now() - startAt) / 1000;
      setElapsed(sec);
    }
  };

  const speed = elapsed > 0 ? Math.round((target.length / elapsed) * 60) : 0;
  // 正确率
  let correct = 0;
  for (let i = 0; i < input.length; i++) if (input[i] === target[i]) correct++;
  const acc = input.length ? Math.round((correct / input.length) * 100) : 100;

  return (
    <Page id="typing" title="打字测速" onBack={onBack}>
      <Card>
        <Text style={st.label}>照着下面的文字输入：</Text>
        <Text style={st.target}>{target}</Text>
      </Card>
      <Card>
        <TextInput
          style={st.input}
          value={input}
          onChangeText={onChange}
          multiline
          autoFocus
          placeholder="在这里输入上面的文字…"
          placeholderTextColor={C.sub}
        />
      </Card>
      {elapsed > 0 && (
        <Card>
          <Row style={st.stats}>
            <View style={st.statBox}>
              <Text style={st.statVal}>{speed}</Text>
              <Text style={st.statKey}>字/分钟</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statVal}>{acc}%</Text>
              <Text style={st.statKey}>正确率</Text>
            </View>
            <View style={st.statBox}>
              <Text style={st.statVal}>{elapsed.toFixed(1)}s</Text>
              <Text style={st.statKey}>用时</Text>
            </View>
          </Row>
        </Card>
      )}
      <Row>
        <Btn text="换一段" onPress={pick} kind="plain" />
        <Btn text="重新开始" onPress={() => { setInput(''); setStartAt(null); setElapsed(0); }} kind="plain" />
      </Row>
      <Card style={{ marginTop: 12 }}>
        <Text style={st.tip}>
          点「换一段」开始新测试。从输入第一个字开始计时，输完全文自动停止并算出速度。中文按字计速，一般聊天 40~60 字/分钟，熟练录入可达 80+。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 12, color: C.sub, marginBottom: 8 },
  target: { fontSize: 16, lineHeight: 26, color: C.text },
  input: {
    fontSize: 16,
    lineHeight: 26,
    minHeight: 90,
    color: C.primary,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  stats: { justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '700', color: C.primary },
  statKey: { fontSize: 12, color: C.sub, marginTop: 4 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

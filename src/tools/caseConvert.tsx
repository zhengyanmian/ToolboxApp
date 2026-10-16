import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';

export default function CaseConvert({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');

  function apply(fn: (s: string) => string) {
    setOut(fn(input));
  }

  return (
    <Page id="case" title="大小写转换" onBack={onBack}>
      <Card>
        <Field label="输入文本" value={input} onChange={setInput} multiline />
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          <Btn kind="plain" text="全部大写" onPress={() => apply((s) => s.toUpperCase())} />
          <Btn kind="plain" text="全部小写" onPress={() => apply((s) => s.toLowerCase())} />
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Btn kind="plain" text="首字母大写" onPress={() => apply((s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase()))} />
          <Btn kind="plain" text="句首大写" onPress={() => apply((s) => s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase()))} />
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Btn kind="plain" text="camelCase" onPress={() => apply(toCamel)} />
          <Btn kind="plain" text="snake_case" onPress={() => apply(toSnake)} />
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <Btn kind="plain" text="交换大小写" onPress={() => apply((s) => s.replace(/[a-zA-Z]/g, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())))} />
          <Btn kind="plain" text="反转文本" onPress={() => apply((s) => [...s].reverse().join(''))} />
        </Row>
      </Card>
      {out !== '' && (
        <Card>
          <Text style={st.outTitle}>结果（长按可复制）</Text>
          <Text style={st.out} selectable>{out}</Text>
        </Card>
      )}
    </Page>
  );
}

function words(s: string): string[] {
  return s.trim().split(/[\s_\-]+/).filter(Boolean);
}
function toCamel(s: string): string {
  const ws = words(s.toLowerCase());
  return ws.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('');
}
function toSnake(s: string): string {
  return words(s).map((w) => w.toLowerCase()).join('_');
}

const st = dynStyles((C) => StyleSheet.create({
  outTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  out: { fontSize: 14, color: C.text, lineHeight: 20 },
}));;

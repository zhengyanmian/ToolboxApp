import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C } from '../ui';
import { Text, StyleSheet } from 'react-native';

export default function JsonFmt({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');
  const [indent, setIndent] = useState(2);

  function format() {
    setErr('');
    setOut('');
    try {
      const v = JSON.parse(input);
      setOut(JSON.stringify(v, null, indent));
    } catch (e: any) {
      setErr('JSON 解析失败：' + (e?.message ?? '格式错误'));
    }
  }

  function minify() {
    setErr('');
    setOut('');
    try {
      setOut(JSON.stringify(JSON.parse(input)));
    } catch (e: any) {
      setErr('JSON 解析失败：' + (e?.message ?? '格式错误'));
    }
  }

  return (
    <Page id="json" title="JSON 格式化" onBack={onBack}>
      <Card>
        <Field label="输入 JSON" value={input} onChange={setInput} multiline placeholder='{"name":"工具箱","tools":24}' />
        <Row>
          <Btn text={`格式化（${indent} 空格）`} onPress={format} />
          <Btn text="压缩" kind="plain" onPress={minify} />
        </Row>
        <Text style={st.indentLink} onPress={() => setIndent(indent === 2 ? 4 : 2)}>
          点此切换缩进：当前 {indent} 空格
        </Text>
      </Card>
      {err ? <Card><Text style={st.err}>{err}</Text></Card> : null}
      {out !== '' && (
        <Card>
          <Text style={st.outTitle}>结果（长按可复制）</Text>
          <Text style={st.out} selectable>{out}</Text>
        </Card>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  indentLink: { fontSize: 13, color: C.primary, marginTop: 10 },
  outTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  out: { fontSize: 13, color: C.text, lineHeight: 19 },
  err: { color: C.warn, fontSize: 13, lineHeight: 18 },
});

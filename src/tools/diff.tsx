import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Page, Card, Field, Row, C } from '../ui';

type Op = { type: 'same' | 'add' | 'del'; text: string };

// LCS 逐行差异
function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'same', text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', text: a[i] }); i++; }
    else { ops.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'del', text: a[i] }); i++; }
  while (j < m) { ops.push({ type: 'add', text: b[j] }); j++; }
  return ops;
}

export default function Diff({ onBack }: { onBack: () => void }) {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const ops = useMemo(
    () => diffLines(left.split('\n'), right.split('\n')),
    [left, right],
  );
  const addCount = ops.filter((o) => o.type === 'add').length;
  const delCount = ops.filter((o) => o.type === 'del').length;

  return (
    <Page id="diff" title="文本差异对比" onBack={onBack}>
      <Card>
        <Field label="原文（A）" value={left} onChange={setLeft} multiline placeholder="左侧内容" />
        <Field label="修改后（B）" value={right} onChange={setRight} multiline placeholder="右侧内容" />
      </Card>
      <Row>
        <Text style={st.stat}>新增 {addCount} 行</Text>
        <Text style={[st.stat, { color: C.warn }]}>删除 {delCount} 行</Text>
      </Row>
      <Card style={{ padding: 8 }}>
        <ScrollView style={{ maxHeight: 380 }}>
          {ops.map((o, i) => (
            <Text
              key={i}
              style={[
                st.line,
                o.type === 'add' && { color: C.ok, backgroundColor: '#e8f7ee' },
                o.type === 'del' && { color: C.warn, backgroundColor: '#fdeaea', textDecorationLine: 'line-through' },
                o.type === 'same' && { color: C.sub },
              ]}>
              {o.type === 'add' ? '+ ' : o.type === 'del' ? '- ' : '  '}
              {o.text || ' '}
            </Text>
          ))}
        </ScrollView>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  stat: { fontSize: 13, color: C.ok, fontWeight: '600', marginLeft: 4, marginBottom: 8 },
  line: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
});

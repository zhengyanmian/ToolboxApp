import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { pinyin } from 'pinyin-pro';
import { Page, Card, Field, Btn, Result, Row, C } from '../ui';

export default function Pinyin({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const text = input.trim();

  let full = '';
  let toneless = '';
  let first = '';
  if (text) {
    try {
      full = pinyin(text, { toneType: 'symbol', type: 'string', nonZh: 'consecutive' });
      toneless = pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' });
      first = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string', nonZh: 'consecutive' });
    } catch {
      full = '';
    }
  }

  return (
    <Page id="pinyin" title="汉字转拼音" onBack={onBack}>
      <Card>
        <Field
          label="输入中文"
          value={input}
          onChange={setInput}
          multiline
          placeholder="例如：中国人民银行"
        />
      </Card>
      {text ? (
        <Card>
          <Result label="带声调" value={full || '—'} />
          <Result label="无声调" value={toneless || '—'} />
          <Result label="首字母" value={first || '—'} />
        </Card>
      ) : null}
      <Card>
        <Text style={st.tip}>基于开源词库（pinyin-pro），支持多音字智能匹配，混合中英文时英文原样保留。</Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({ tip: { fontSize: 12, color: C.sub, lineHeight: 18 } });

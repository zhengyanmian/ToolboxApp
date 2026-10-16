import React, { useState } from 'react';
import { Page, Card, Field, C, dynStyles} from '../ui';
import { Text, StyleSheet, View } from 'react-native';

export default function RegexTester({ onBack }: { onBack: () => void }) {
  const [pattern, setPattern] = useState('\\d{3}-\\d{4}');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('办公电话：0571-8888，手机：13812345678，备用：020-6666');

  let result: string[] = [];
  let err = '';
  let matchCount = 0;
  if (pattern && text) {
    try {
      let f = flags || 'g';
      if (!f.includes('g')) f += 'g';
      const re = new RegExp(pattern, f);
      const matches = text.match(re) ?? [];
      matchCount = matches.length;
      result = matches.slice(0, 50);
    } catch (e: any) {
      err = '正则语法错误：' + (e?.message ?? '');
    }
  }

  return (
    <Page id="regex" title="正则测试" onBack={onBack}>
      <Card>
        <Field label="正则表达式" value={pattern} onChange={setPattern} placeholder="例如：\d+" />
        <Field label="匹配测试文本" value={text} onChange={setText} multiline />
        <View style={st.flagRow}>
          <Text style={st.flagLabel}>标志：</Text>
          {['g', 'i', 'm', 's', 'u'].map((f) => {
            const on = flags.includes(f);
            return (
              <Text
                key={f}
                style={[st.flag, on && st.flagOn]}
                onPress={() =>
                  setFlags(on ? flags.replace(f, '') : (flags + f).split('').sort().join(''))
                }>
                {f}
              </Text>
            );
          })}
        </View>
      </Card>
      {err ? <Card><Text style={st.err}>{err}</Text></Card> : null}
      <Card>
        <Text style={st.sec}>{err ? '—' : matchCount > 0 ? `匹配到 ${matchCount} 处（最多显示 50 条）` : '无匹配'}</Text>
        {result.map((m, i) => (
          <Text key={i} style={st.item} selectable>
            {i + 1}. {m}
          </Text>
        ))}
      </Card>
      <Card>
        <Text style={st.tip}>
          常用：\d 数字、\w 字母数字下划线、+ 一个或多个、* 零个或多个、[abc] 字符集合、^ $ 行首行尾、点号任意字符。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  flagLabel: { fontSize: 13, color: C.sub },
  flag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
    fontSize: 13, color: C.sub, overflow: 'hidden',
  },
  flagOn: { backgroundColor: C.primarySoft, borderColor: C.primary, color: C.primary, fontWeight: '600' },
  sec: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  item: { fontSize: 14, color: C.text, paddingVertical: 3 },
  err: { color: C.warn, fontSize: 13, lineHeight: 18 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

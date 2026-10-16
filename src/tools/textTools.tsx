import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// 文本工具合集：去重 / 替换 / 统计
type Tab = 'dedup' | 'replace' | 'count';

export default function TextTools({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('dedup');
  const [input, setInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [out, setOut] = useState('');

  function dedup() {
    const lines = input.split(/\r?\n/);
    const seen = new Set<string>();
    const res: string[] = [];
    for (const l of lines) {
      if (!seen.has(l)) { seen.add(l); res.push(l); }
    }
    setOut(res.join('\n'));
  }

  function replaceAll() {
    if (!from) { setOut(input); return; }
    setOut(input.split(from).join(to));
  }

  function count() {
    setOut('');
  }

  const stats = (() => {
    const chars = input.length;
    const noSpace = input.replace(/\s/g, '').length;
    const lines = input ? input.split(/\r?\n/).length : 0;
    const cn = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
    const en = (input.match(/[a-zA-Z]+/g) || []).length;
    const words = (input.match(/[a-zA-Z]+|\d+/g) || []).length;
    return { chars, noSpace, lines, cn, en, words };
  })();

  return (
    <Page id="text" title="文本工具" onBack={onBack}>
      <View style={st.tabs}>
        {([['dedup', '去重'], ['replace', '替换'], ['count', '统计']] as [Tab, string][]).map(
          ([t, label]) => (
            <TouchableOpacity
              key={t}
              style={[st.tab, tab === t && st.tabOn]}
              onPress={() => { setTab(t); setOut(''); }}>
              <Text style={[st.tabText, tab === t && st.tabTextOn]}>{label}</Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {tab === 'dedup' && (
        <Card>
          <Text style={st.tip}>按行去重，保留首次出现的行。</Text>
          <Field label="原文（每行一条）" value={input} onChange={setInput} multiline />
          <Row>
            <Btn text="去重" onPress={dedup} />
          </Row>
        </Card>
      )}

      {tab === 'replace' && (
        <Card>
          <Field label="查找内容" value={from} onChange={setFrom} placeholder="要被替换的文字" />
          <Field label="替换为" value={to} onChange={setTo} placeholder="替换成什么（留空即删除）" />
          <Field label="原文" value={input} onChange={setInput} multiline />
          <Row>
            <Btn text="全部替换" onPress={replaceAll} />
          </Row>
        </Card>
      )}

      {tab === 'count' && (
        <Card>
          <Field label="输入文本" value={input} onChange={setInput} multiline />
        </Card>
      )}

      {tab === 'count' && (
        <Card>
          <Result label="总字符数" value={String(stats.chars)} />
          <Result label="不含空格" value={String(stats.noSpace)} />
          <Result label="行数" value={String(stats.lines)} />
          <Result label="中文字符" value={String(stats.cn)} />
          <Result label="英文单词" value={String(stats.en)} />
          <Result label="数字段/词数" value={String(stats.words)} />
        </Card>
      )}

      {out !== '' && (
        <Card>
          <Text style={st.outTitle}>结果（长按可复制）</Text>
          <Text style={st.out} selectable>{out}</Text>
        </Card>
      )}
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.cardSolid, borderWidth: 1, borderColor: C.line,
  },
  tabOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  tabText: { fontSize: 14, color: C.sub },
  tabTextOn: { color: C.primary, fontWeight: '600' },
  tip: { fontSize: 12, color: C.sub, marginBottom: 10 },
  outTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  out: { fontSize: 14, color: C.text, lineHeight: 20 },
}));;

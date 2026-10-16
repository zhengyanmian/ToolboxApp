import React, { useState } from 'react';
import { Page, Card, Field, Result, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const BASES = [
  { label: '二进制', base: 2 },
  { label: '八进制', base: 8 },
  { label: '十进制', base: 10 },
  { label: '十六进制', base: 16 },
];

export default function BaseConverter({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [from, setFrom] = useState(10);

  let parsed: bigint | null = null;
  let err = '';
  if (input.trim()) {
    try {
      const clean = input.trim().replace(/^0[xob]/i, '');
      parsed = BigInt(parseIntHeader(clean, from));
    } catch {
      err = '输入不是合法的进制数';
      parsed = null;
    }
  }

  return (
    <Page id="base" title="进制转换" onBack={onBack}>
      <Card>
        <Field
          label={`输入数值（当前：${BASES.find((b) => b.base === from)!.label}）`}
          value={input}
          onChange={setInput}
          placeholder={from === 16 ? '例如 FF' : '例如 1010'}
        />
        <View style={st.row}>
          {BASES.map((b) => (
            <TouchableOpacity
              key={b.base}
              style={[st.chip, b.base === from && st.chipOn]}
              onPress={() => setFrom(b.base)}>
              <Text style={[st.chipText, b.base === from && st.chipTextOn]}>
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {parsed !== null && (
        <Card>
          {BASES.map((b) => (
            <Result
              key={b.base}
              label={b.label}
              value={formatBig(parsed!, b.base)}
            />
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.tip}>支持任意长度整数，十六进制不区分大小写。</Text>
      </Card>
    </Page>
  );
}

function parseIntHeader(s: string, base: number): string {
  // BigInt 不支持 parseInt 大数，这里手写逐位解析
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  const low = s.toLowerCase();
  let acc = 0n;
  const B = BigInt(base);
  for (const ch of low) {
    const d = digits.indexOf(ch);
    if (d < 0 || d >= base) throw new Error('bad digit');
    acc = acc * B + BigInt(d);
  }
  return acc.toString(10);
}

function formatBig(n: bigint, base: number): string {
  return n.toString(base).toUpperCase();
}

const st = dynStyles((C) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
  },
  chipOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  chipText: { fontSize: 14, color: C.sub },
  chipTextOn: { color: C.primary, fontWeight: '600' },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
  tip: { fontSize: 12, color: C.sub },
}));;

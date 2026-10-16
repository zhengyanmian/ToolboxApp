import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Btn, Result, Row, C } from '../ui';

const MAP: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function toRoman(n: number): string {
  let x = n;
  let out = '';
  for (const [v, s] of MAP) while (x >= v) { out += s; x -= v; }
  return out;
}

function fromRoman(s: string): number {
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const u = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < u.length; i++) {
    const c = val[u[i]];
    const next = val[u[i + 1]] || 0;
    total += c < next ? -c : c;
  }
  return total;
}

export default function Roman({ onBack }: { onBack: () => void }) {
  const [num, setNum] = useState('');
  const [rom, setRom] = useState('');
  const n = parseInt(num, 10);
  const validN = Number.isInteger(n) && n >= 1 && n <= 3999;
  const r = rom.trim().toUpperCase();
  const validR = /^[MDCLXVI]+$/.test(r);

  return (
    <Page id="roman" title="罗马数字互转" onBack={onBack}>
      <Card>
        <Field
          label="阿拉伯数字 → 罗马数字（1 ~ 3999）"
          value={num}
          onChange={setNum}
          keyboardType="numbers-and-punctuation"
          placeholder="例如 2026"
        />
        {num ? (
          <Text style={st.val}>{validN ? toRoman(n) : '超出范围（1~3999）'}</Text>
        ) : null}
      </Card>
      <Card>
        <Field
          label="罗马数字 → 阿拉伯数字"
          value={rom}
          onChange={setRom}
          placeholder="例如 MCMLXXXIV"
        />
        {rom ? (
          <Text style={st.val}>{validR ? String(fromRoman(r)) : '包含非法字符'}</Text>
        ) : null}
      </Card>
      <Card>
        <Text style={st.tip}>对照表：Ⅰ=1 · Ⅴ=5 · Ⅹ=10 · Ⅼ=50 · Ⅽ=100 · Ⅾ=500 · Ⅿ=1000，小数字在大数字左边表示减（如 Ⅳ=4）。</Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  val: { fontSize: 22, fontWeight: '700', color: C.primary, marginTop: 4 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

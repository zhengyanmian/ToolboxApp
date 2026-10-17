import React, { useState } from 'react';
import { Page, Card, DateField, Field, Btn, Row, Result, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(d.getTime())) return null;
  return d;
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 星期${'日一二三四五六'[d.getDay()]}`;
}

export default function DateCalc({ onBack }: { onBack: () => void }) {
  const [d1, setD1] = useState(today());
  const [d2, setD2] = useState(today());
  const [base, setBase] = useState(today());
  const [days, setDays] = useState('100');

  const a = parseDate(d1);
  const b = parseDate(d2);
  const bb = parseDate(base);
  const n = parseInt(days, 10);

  let diffDays = '';
  if (a && b) {
    const ms = b.getTime() - a.getTime();
    diffDays = String(Math.round(ms / 86400000));
  }

  let future = '';
  if (bb && !isNaN(n)) {
    const f = new Date(bb.getTime() + n * 86400000);
    future = fmtDate(f);
  }

  return (
    <Page id="date" title="日期计算" onBack={onBack}>
      <Card>
        <Text style={st.sec}>① 两个日期相差多少天</Text>
        <DateField label="开始日期" value={d1} onChange={setD1} mode="date" />
        <DateField label="结束日期" value={d2} onChange={setD2} mode="date" />
        {diffDays && <Result label="相差天数" value={`${diffDays} 天`} />}
      </Card>
      <Card>
        <Text style={st.sec}>② 日期加减 N 天</Text>
        <DateField label="基准日期" value={base} onChange={setBase} mode="date" />
        <Field label="天数（可为负）" value={days} onChange={setDays} keyboardType="numbers-and-punctuation" />
        {future && <Result label="计算结果" value={future} />}
      </Card>
      <Card>
        <Text style={st.tip}>日期格式：YYYY-MM-DD，也支持 2026/1/1 写法。星期为自动推算。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  sec: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

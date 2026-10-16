import React, { useState } from 'react';
import { Page, Card, Field, Result, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Mode = 'simple' | 'compound';

export default function InterestCalc({ onBack }: { onBack: () => void }) {
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('2.5');
  const [years, setYears] = useState('3');
  const [mode, setMode] = useState<Mode>('compound');

  const P = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100;
  const n = parseFloat(years) || 0;

  let total = 0, interest = 0, desc = '';
  if (mode === 'simple') {
    interest = P * r * n;
    total = P + interest;
    desc = '单利：每年利息 = 本金 × 利率';
  } else {
    total = P * Math.pow(1 + r, n);
    interest = total - P;
    desc = '复利（年复）：每年利息滚入本金';
  }

  // 每年明细（复利展示前 10 年）
  const rows: { year: number; amount: number }[] = [];
  for (let y = 1; y <= Math.min(n, 10); y++) {
    rows.push({
      year: y,
      amount: mode === 'compound' ? P * Math.pow(1 + r, y) : P + P * r * y,
    });
  }

  return (
    <Page id="interest" title="利息计算" onBack={onBack}>
      <Card>
        <View style={st.modeRow}>
          <TouchableOpacity style={[st.mode, mode === 'compound' && st.modeOn]} onPress={() => setMode('compound')}>
            <Text style={[st.modeText, mode === 'compound' && st.modeTextOn]}>复利</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.mode, mode === 'simple' && st.modeOn]} onPress={() => setMode('simple')}>
            <Text style={[st.modeText, mode === 'simple' && st.modeTextOn]}>单利</Text>
          </TouchableOpacity>
        </View>
        <Field label="本金（元）" value={principal} onChange={setPrincipal} keyboardType="decimal-pad" />
        <Field label="年利率（%）" value={rate} onChange={setRate} keyboardType="decimal-pad" />
        <Field label="存期（年）" value={years} onChange={setYears} keyboardType="decimal-pad" />
      </Card>
      <Card>
        <Result label="到期本息合计" value={`${fmt(total)} 元`} />
        <Result label="利息" value={`${fmt(interest)} 元`} />
        <Result label="折合年化收益" value={n > 0 ? `${((interest / P / n) * 100).toFixed(2)}%` : '—'} />
      </Card>
      {rows.length > 0 && (
        <Card>
          <Text style={st.sec}>逐年明细</Text>
          {rows.map((row) => (
            <Result key={row.year} label={`第 ${row.year} 年`} value={`${fmt(row.amount)} 元`} />
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.tip}>{desc}。结果仅供估算，实际以银行计息规则为准。</Text>
      </Card>
    </Page>
  );
}

function fmt(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const st = dynStyles((C) => StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mode: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
  },
  modeOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  modeText: { fontSize: 14, color: C.sub },
  modeTextOn: { color: C.primary, fontWeight: '600' },
  sec: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

import React, { useState } from 'react';
import { Page, Card, Field, Result, C } from '../ui';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Mode = 'ac' | 'ab'; // 等额本息 / 等额本金

export default function Mortgage({ onBack }: { onBack: () => void }) {
  const [amount, setAmount] = useState('100'); // 万元
  const [years, setYears] = useState('30');
  const [rate, setRate] = useState('3.6'); // 年利率 %
  const [mode, setMode] = useState<Mode>('ac');

  const P = parseFloat(amount) * 10000;
  const months = parseInt(years, 10) * 12;
  const mr = parseFloat(rate) / 100 / 12;

  if (!P || !months || isNaN(mr)) {
    return (
      <Page id="mortgage" title="房贷计算器" onBack={onBack}>
        <Card><Text style={st.tip}>请输入贷款金额、年限和利率。</Text></Card>
      </Page>
    );
  }

  let acMonthly = 0, acTotal = 0;
  if (mode === 'ac') {
    acMonthly = (P * mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1);
    acTotal = acMonthly * months;
  }
  let abFirst = 0, abDecrease = 0, abTotal = 0;
  if (mode === 'ab') {
    abFirst = P / months + P * mr;
    abDecrease = (P / months) * mr;
    abTotal = (P / months) * months + P * mr * (months + 1) / 2;
  }

  return (
    <Page id="mortgage" title="房贷计算器" onBack={onBack}>
      <Card>
        <View style={st.modeRow}>
          <TouchableOpacity style={[st.mode, mode === 'ac' && st.modeOn]} onPress={() => setMode('ac')}>
            <Text style={[st.modeText, mode === 'ac' && st.modeTextOn]}>等额本息</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.mode, mode === 'ab' && st.modeOn]} onPress={() => setMode('ab')}>
            <Text style={[st.modeText, mode === 'ab' && st.modeTextOn]}>等额本金</Text>
          </TouchableOpacity>
        </View>
        <Field label="贷款金额（万元）" value={amount} onChange={setAmount} keyboardType="decimal-pad" />
        <Field label="贷款年限（年）" value={years} onChange={setYears} keyboardType="decimal-pad" />
        <Field label="年利率（%）" value={rate} onChange={setRate} keyboardType="decimal-pad" />
      </Card>
      {mode === 'ac' ? (
        <Card>
          <Result label="每月还款" value={`${fmt(acMonthly)} 元`} />
          <Result label="还款总额" value={`${fmt(acTotal)} 元`} />
          <Result label="支付利息" value={`${fmt(acTotal - P)} 元`} />
        </Card>
      ) : (
        <Card>
          <Result label="首月还款" value={`${fmt(abFirst)} 元`} />
          <Result label="每月递减" value={`${fmt(abDecrease)} 元`} />
          <Result label="末月还款" value={`${fmt(abFirst - abDecrease * (months - 1))} 元`} />
          <Result label="还款总额" value={`${fmt(abTotal)} 元`} />
          <Result label="支付利息" value={`${fmt(abTotal - P)} 元`} />
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          等额本息：每月还款额固定，前期利息占比高；等额本金：每月还固定本金+剩余利息，月供逐月递减，总利息更少。
        </Text>
      </Card>
    </Page>
  );
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}

const st = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  mode: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
  },
  modeOn: { backgroundColor: '#e8f0fe', borderColor: C.primary },
  modeText: { fontSize: 14, color: C.sub },
  modeTextOn: { color: C.primary, fontWeight: '600' },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C } from '../ui';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';

// 数据源：open.er-api.com 免费汇率接口（无需 Key），失败时提示检查网络
type Rates = Record<string, number> | null;

const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'KRW', 'HKD', 'TWD', 'SGD', 'AUD', 'CAD', 'RUB', 'THB', 'MYR', 'VND'];

export default function ExchangeRate({ onBack }: { onBack: () => void }) {
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CNY');
  const [amount, setAmount] = useState('100');
  const [rates, setRates] = useState<Rates>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [updated, setUpdated] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const resp = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      const json = await resp.json();
      if (json && json.rates) {
        setRates(json.rates);
        setUpdated(json.time_last_update_utc ?? '');
      } else {
        setErr('接口返回异常');
      }
    } catch {
      setErr('网络请求失败，请检查网络后重试');
    }
    setLoading(false);
  }

  const a = parseFloat(amount);
  let out = '';
  if (rates && !isNaN(a)) {
    const toRate = rates[to];
    if (toRate) out = `${fmt(a * toRate)} ${to}`;
  }

  return (
    <Page id="rate" title="汇率换算" onBack={onBack}>
      <Card>
        <Field label="金额" value={amount} onChange={setAmount} keyboardType="decimal-pad" />
        <Text style={st.label}>源币种</Text>
        <Chips options={CURRENCIES} value={from} onChange={(v) => { setFrom(v); setRates(null); }} />
        <Text style={[st.label, { marginTop: 10 }]}>目标币种</Text>
        <Chips options={CURRENCIES} value={to} onChange={setTo} />
        <Row style={{ marginTop: 12 }}>
          <Btn text={loading ? '查询中…' : '查询汇率'} onPress={load} />
        </Row>
        {loading && <ActivityIndicator style={{ marginTop: 10 }} color={C.primary} />}
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {out && (
        <Card>
          <Result label={`${fmt2(a)} ${from} =`} value={out} />
          <Result label="当前汇率" value={`1 ${from} = ${fmt4(rates![to])} ${to}`} />
        </Card>
      )}
      {updated ? (
        <Card>
          <Text style={st.tip}>数据更新时间：{updated}</Text>
        </Card>
      ) : null}
    </Page>
  );
}

function Chips(props: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={st.chips}>
      {props.options.map((o) => (
        <Text
          key={o}
          onPress={() => props.onChange(o)}
          style={[st.chip, o === props.value && st.chipOn]}>
          {o}
        </Text>
      ))}
    </View>
  );
}

function fmt(v: number): string {
  return Math.round(v * 100) / 100 >= 1
    ? Math.round(v).toLocaleString('en-US')
    : v.toFixed(4);
}
function fmt2(v: number): string { return String(Math.round(v * 100) / 100); }
function fmt4(v: number): string { return String(Math.round(v * 10000) / 10000); }

const st = StyleSheet.create({
  label: { fontSize: 13, color: C.sub, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
    fontSize: 13, color: C.sub, overflow: 'hidden',
  },
  chipOn: { backgroundColor: '#e8f0fe', borderColor: C.primary, color: C.primary, fontWeight: '600' },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
  tip: { fontSize: 12, color: C.sub },
});

import React, { useState } from 'react';
import { Page, Card, Field, Result, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// 单位定义：以基准单位换算
type Unit = { name: string; factor: number };
type Category = { name: string; units: Unit[]; special?: 'temperature' };

const CATS: Category[] = [
  {
    name: '长度',
    units: [
      { name: '毫米(mm)', factor: 0.001 },
      { name: '厘米(cm)', factor: 0.01 },
      { name: '米(m)', factor: 1 },
      { name: '千米(km)', factor: 1000 },
      { name: '英寸(in)', factor: 0.0254 },
      { name: '英尺(ft)', factor: 0.3048 },
      { name: '英里(mi)', factor: 1609.344 },
      { name: '海里(nmi)', factor: 1852 },
      { name: '里', factor: 500 },
      { name: '尺', factor: 1 / 3 },
    ],
  },
  {
    name: '重量',
    units: [
      { name: '毫克(mg)', factor: 0.000001 },
      { name: '克(g)', factor: 0.001 },
      { name: '千克(kg)', factor: 1 },
      { name: '吨(t)', factor: 1000 },
      { name: '斤', factor: 0.5 },
      { name: '两', factor: 0.05 },
      { name: '盎司(oz)', factor: 0.0283495 },
      { name: '磅(lb)', factor: 0.453592 },
    ],
  },
  {
    name: '面积',
    units: [
      { name: '平方米(㎡)', factor: 1 },
      { name: '平方千米(k㎡)', factor: 1e6 },
      { name: '亩', factor: 666.667 },
      { name: '公顷', factor: 10000 },
      { name: '平方英尺', factor: 0.092903 },
    ],
  },
  {
    name: '体积',
    units: [
      { name: '毫升(mL)', factor: 0.001 },
      { name: '升(L)', factor: 1 },
      { name: '立方米(m³)', factor: 1000 },
      { name: '加仑(美)', factor: 3.78541 },
    ],
  },
  {
    name: '数据',
    units: [
      { name: 'B', factor: 1 },
      { name: 'KB', factor: 1024 },
      { name: 'MB', factor: 1024 ** 2 },
      { name: 'GB', factor: 1024 ** 3 },
      { name: 'TB', factor: 1024 ** 4 },
    ],
  },
  {
    name: '速度',
    units: [
      { name: '米/秒', factor: 1 },
      { name: '千米/时', factor: 1 / 3.6 },
      { name: '英里/时', factor: 0.44704 },
      { name: '节', factor: 0.514444 },
    ],
  },
  { name: '温度', units: [], special: 'temperature' },
];

export default function UnitConverter({ onBack }: { onBack: () => void }) {
  const [ci, setCi] = useState(0);
  const cat = CATS[ci];
  const [val, setVal] = useState('1');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(2);

  const num = parseFloat(val);
  const results: { label: string; value: string }[] = [];

  if (cat.special === 'temperature') {
    if (!isNaN(num)) {
      const toC = from === 0 ? num : from === 1 ? (num - 32) / 1.8 : num - 273.15;
      results.push(
        { label: '摄氏度(℃)', value: fmt(toC) },
        { label: '华氏度(℉)', value: fmt(toC * 1.8 + 32) },
        { label: '开尔文(K)', value: fmt(toC + 273.15) },
      );
    }
  } else if (!isNaN(num)) {
    cat.units.forEach((u, i) => {
      results.push({ label: u.name, value: fmt((num * cat.units[from].factor) / u.factor) });
      void i;
    });
  }
  // 修正：直接算到每个单位，from 单位
  const fromUnit = cat.special === 'temperature' ? null : cat.units[from];
  const out = cat.special === 'temperature'
    ? results
    : cat.units.map((u, i) => ({
        label: u.name,
        value: i === from ? fmt(num) : fmt((num * (fromUnit?.factor ?? 1)) / u.factor),
      }));

  return (
    <Page id="unit" title="单位换算" onBack={onBack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CATS.map((c, i) => (
            <TouchableOpacity
              key={c.name}
              style={[st.chip, i === ci && st.chipOn]}
              onPress={() => { setCi(i); setFrom(0); setTo(0); }}>
              <Text style={[st.chipText, i === ci && st.chipTextOn]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <Card>
        <Field label="数值" value={val} onChange={setVal} keyboardType="decimal-pad" placeholder="输入数值" />
        <Text style={st.label}>从哪个单位开始（结果会列出全部单位）</Text>
        <View style={st.row}>
          {(cat.special === 'temperature'
            ? [{ name: '摄氏度' }, { name: '华氏度' }, { name: '开尔文' }]
            : cat.units
          ).map((u, i) => (
            <TouchableOpacity
              key={u.name}
              style={[st.chip, i === from && st.chipOn]}
              onPress={() => setFrom(i)}>
              <Text style={[st.chipText, i === from && st.chipTextOn]}>{u.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
      {out.length > 0 && (
        <Card>
          {out.map((r) => (
            <Result key={r.label} label={r.label} value={r.value} />
          ))}
        </Card>
      )}
    </Page>
  );
}

function fmt(v: number): string {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-6 || a >= 1e12)) return v.toExponential(6);
  return String(Math.round(v * 1e8) / 1e8);
}

const st = dynStyles((C) => StyleSheet.create({
  label: { fontSize: 13, color: C.sub, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
  },
  chipOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.sub },
  chipTextOn: { color: C.primary, fontWeight: '600' },
}));;

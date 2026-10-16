import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C } from '../ui';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

function nowSec(): string {
  return String(Math.floor(Date.now() / 1000));
}

function tsToDate(ts: number): string {
  const d = new Date(ts);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function Timestamp({ onBack }: { onBack: () => void }) {
  const [ts, setTs] = useState(nowSec());
  const [dt, setDt] = useState('');
  const [cur, setCur] = useState(nowSec());

  let fromTs = '';
  const n = Number(ts);
  if (ts && !isNaN(n)) {
    // 自动识别 秒 / 毫秒
    const v = Math.abs(n) > 1e12 ? n : n * 1000;
    fromTs = tsToDate(v);
  }

  let toTs = '';
  if (dt.trim()) {
    const t = new Date(dt.trim().replace(/-/g, '/')).getTime();
    if (!isNaN(t)) toTs = String(Math.floor(t / 1000));
    else toTs = '无法解析';
  }

  return (
    <Page id="timestamp" title="时间戳转换" onBack={onBack}>
      <Card>
        <Text style={st.sec}>当前时间戳</Text>
        <Text style={st.now} selectable>{cur}</Text>
        <Row style={{ marginTop: 8 }}>
          <Btn text="刷新" kind="plain" onPress={() => setCur(nowSec())} />
        </Row>
      </Card>
      <Card>
        <Text style={st.sec}>时间戳 → 日期</Text>
        <Field label="时间戳（秒或毫秒自动识别）" value={ts} onChange={setTs} keyboardType="numbers-and-punctuation" />
        {fromTs && <Result label="对应时间" value={fromTs} />}
      </Card>
      <Card>
        <Text style={st.sec}>日期 → 时间戳</Text>
        <Field label="日期时间" value={dt} onChange={setDt} placeholder="2026-10-16 18:30:00" />
        {toTs && <Result label="时间戳（秒）" value={toTs} />}
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  sec: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
  now: { fontSize: 24, fontWeight: '700', color: C.primary },
});

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Page, Card, Field, Result, Btn, Row, C } from '../ui';

const DAY = 86400000;

function fmtDur(ms: number): string {
  const neg = ms < 0;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const core = `${d ? d + '天' : ''}${h}小时${m}分${s}秒`;
  return neg ? `早于目标 ${core}` : core;
}

export default function TimeCalc({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'diff' | 'add'>('diff');
  const [d1, setD1] = useState('');
  const [t1, setT1] = useState('');
  const [d2, setD2] = useState('');
  const [t2, setT2] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<'分' | '时' | '天'>('天');

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let result = '';
  let err = '';
  if (mode === 'diff') {
    const a = new Date(`${d1 || today}T${t1 || '00:00'}`).getTime();
    const b = new Date(`${d2 || today}T${t2 || '00:00'}`).getTime();
    if (!isNaN(a) && !isNaN(b)) {
      const diff = b - a;
      result = fmtDur(diff);
      const days = (diff / DAY).toFixed(2);
      result += `（${diff >= 0 ? '+' : ''}${days} 天）`;
    } else if (d1 || d2) {
      err = '日期格式：2026-10-16，时间格式：14:30';
    }
  } else {
    const base = new Date(`${d1 || today}T${t1 || curTime}`).getTime();
    const n = parseFloat(amount);
    if (!isNaN(base) && !isNaN(n)) {
      const mul = unit === '分' ? 60000 : unit === '时' ? 3600000 : DAY;
      const target = new Date(base + n * mul);
      if (!isNaN(target.getTime())) {
        result = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(
          target.getDate(),
        ).padStart(2, '0')} ${String(target.getHours()).padStart(2, '0')}:${String(
          target.getMinutes(),
        ).padStart(2, '0')}:${String(target.getSeconds()).padStart(2, '0')}`;
      }
    } else if (amount) {
      err = '请输入数字时长';
    }
  }

  return (
    <Page id="timecalc" title="时间计算器" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="两个时刻相减" kind={mode === 'diff' ? 'primary' : 'plain'} onPress={() => setMode('diff')} />
          <Btn text="时刻加减时长" kind={mode === 'add' ? 'primary' : 'plain'} onPress={() => setMode('add')} />
        </Row>
      </Card>
      <Card>
        <Field label={`日期 1（回车留空=今天 ${today}）`} value={d1} onChange={setD1} placeholder="2026-10-16" />
        <Field label="时间 1（留空=00:00）" value={t1} onChange={setT1} placeholder="08:30" />
        {mode === 'diff' ? (
          <>
            <Field label="日期 2" value={d2} onChange={setD2} placeholder="2026-12-31" />
            <Field label="时间 2（留空=00:00）" value={t2} onChange={setT2} placeholder="18:00" />
          </>
        ) : (
          <>
            <Field label="时长数值" value={amount} onChange={setAmount} keyboardType="numbers-and-punctuation" placeholder="可正可负，如 -90" />
            <Row>
              {(['分', '时', '天'] as const).map((u) => (
                <Btn key={u} text={u} kind={unit === u ? 'primary' : 'plain'} onPress={() => setUnit(u)} />
              ))}
            </Row>
          </>
        )}
        {result ? <Result label="结果" value={result} copyable /> : null}
        {err ? <Text style={{ color: C.warn, fontSize: 13, marginTop: 8 }}>{err}</Text> : null}
      </Card>
    </Page>
  );
}

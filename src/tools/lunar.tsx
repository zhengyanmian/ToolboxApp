import React, { useState } from 'react';
import { Page, Card, Field, Result, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';
import { Lunar, Solar } from 'lunar-typescript';

export default function LunarTool({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState(todayStr());

  const m = date.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let rows: { k: string; v: string }[] = [];
  let err = '';
  if (m) {
    try {
      const solar = Solar.fromYmd(+m[1], +m[2], +m[3]);
      const lunar = solar.getLunar();
      rows = [
        { k: '公历', v: `${solar.toYmd()} 星期${solar.getWeekInChinese()}` },
        { k: '农历', v: `${lunar.toString()}` },
        { k: '干支', v: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日` },
        { k: '生肖', v: lunar.getYearShengXiao() },
        { k: '节气', v: lunar.getJieQi() || '（当日无节气）' },
        { k: '节日', v: [solar.getFestivals().join(' '), lunar.getFestivals().join(' ')].filter(Boolean).join(' ') || '（无）' },
        { k: '宜', v: lunar.getDayYi().join(' ') },
        { k: '忌', v: lunar.getDayJi().join(' ') },
      ];
    } catch {
      err = '日期无效';
    }
  } else {
    err = '日期格式：YYYY-MM-DD';
  }

  return (
    <Page id="lunar" title="农历 / 黄历" onBack={onBack}>
      <Card>
        <Field label="公历日期" value={date} onChange={setDate} placeholder="2026-10-16" />
      </Card>
      {err ? (
        <Card><Text style={st.err}>{err}</Text></Card>
      ) : rows.length > 0 ? (
        <Card>
          {rows.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      ) : null}
      <Card>
        <Text style={st.tip}>
          数据由开源库 lunar-typescript 本地计算，含农历、干支、生肖、二十四节气、传统节日与宜忌，完全离线。
        </Text>
      </Card>
    </Page>
  );
}

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const st = dynStyles((C) => StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  err: { color: C.warn, fontSize: 13 },
}));;

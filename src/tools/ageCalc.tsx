import React, { useState } from 'react';
import { Page, Card, DateField, Result, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';

export default function AgeCalc({ onBack }: { onBack: () => void }) {
  const [birth, setBirth] = useState('2000-01-01');

  const m = birth.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let rows: { k: string; v: string }[] = [];
  if (m) {
    const b = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(b.getTime()) && b.getTime() < Date.now()) {
      const now = new Date();
      // 周岁
      let age = now.getFullYear() - b.getFullYear();
      const hadBirthday =
        now.getMonth() > b.getMonth() ||
        (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
      if (!hadBirthday) age--;
      // 虚岁：出生即 1 岁，过农历年加一（此处按公历年差近似）
      const virtual = now.getFullYear() - b.getFullYear() + 1;
      // 生活天数
      const days = Math.floor((now.getTime() - b.getTime()) / 86400000);
      // 下个生日
      let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
        next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
      }
      const toNext = Math.ceil((next.getTime() - now.getTime()) / 86400000);
      const weekDay = '日一二三四五六'[b.getDay()];
      rows = [
        { k: '出生那天', v: `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())} 星期${weekDay}` },
        { k: '周岁', v: `${age} 岁` },
        { k: '虚岁（按公历年差）', v: `${virtual} 岁` },
        { k: '已生活', v: `${days.toLocaleString('en-US')} 天（约 ${(days / 365.25).toFixed(1)} 年）` },
        { k: '下次生日', v: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}，还有 ${toNext} 天` },
      ];
    } else {
      rows = [{ k: '错误', v: '日期无效或晚于今天' }];
    }
  }

  return (
    <Page id="age" title="年龄计算" onBack={onBack}>
      <Card>
        <DateField label="出生日期" value={birth} onChange={setBirth} mode="date" />
      </Card>
      {rows.length > 0 && (
        <Card>
          {rows.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          虚岁按公历年差近似（出生算 1 岁、每过一个公历年 +1）；严格按农历春节计算的虚岁略有出入。
        </Text>
      </Card>
    </Page>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const st = dynStyles((C) => StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

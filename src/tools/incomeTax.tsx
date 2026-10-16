import React, { useState } from 'react';
import { Page, Card, Field, Result, C } from '../ui';
import { Text, StyleSheet } from 'react-native';

// 年度综合所得税率表（全年应纳税所得额，元）
const BRACKETS = [
  { limit: 36000, rate: 0.03, deduct: 0 },
  { limit: 144000, rate: 0.1, deduct: 2520 },
  { limit: 300000, rate: 0.2, deduct: 16920 },
  { limit: 420000, rate: 0.25, deduct: 31920 },
  { limit: 660000, rate: 0.3, deduct: 52920 },
  { limit: 960000, rate: 0.35, deduct: 85920 },
  { limit: Infinity, rate: 0.45, deduct: 181920 },
];

export default function IncomeTax({ onBack }: { onBack: () => void }) {
  const [income, setIncome] = useState('200000');
  const [social, setSocial] = useState('24000');
  const [special, setSpecial] = useState('12000');

  const inc = parseFloat(income) || 0;
  const soc = parseFloat(social) || 0;
  const sp = parseFloat(special) || 0;

  // 应纳税所得额 = 收入 - 6万起征点 - 三险一金 - 专项附加
  const taxable = Math.max(0, inc - 60000 - soc - sp);
  const b = BRACKETS.find((x) => taxable <= x.limit)!;
  const tax = taxable * b.rate - b.deduct;
  const after = inc - soc - tax;

  const bracketLabel =
    taxable > 0
      ? `${(b.rate * 100).toFixed(0)}% 档`
      : '无需缴税';

  return (
    <Page id="tax" title="个税计算" onBack={onBack}>
      <Card>
        <Field label="全年收入总额（元）" value={income} onChange={setIncome} keyboardType="decimal-pad" />
        <Field label="全年三险一金（元）" value={social} onChange={setSocial} keyboardType="decimal-pad" />
        <Field label="全年专项附加扣除（元）" value={special} onChange={setSpecial} keyboardType="decimal-pad" placeholder="子女教育、房贷、赡养老人等合计" />
      </Card>
      <Card>
        <Result label="应纳税所得额" value={`${fmt(taxable)} 元`} />
        <Result label="适用税率" value={bracketLabel} />
        <Result label="全年应缴个税" value={`${fmt(Math.max(0, tax))} 元`} />
        <Result label="税后收入（扣社保）" value={`${fmt(after)} 元`} />
      </Card>
      <Card>
        <Text style={st.tip}>
          按年度综合所得税率表计算：起征点 6 万元/年，税率 3%~45% 七档超额累进。
          专项附加扣除请按实际情况填写（子女教育每孩每月 2000、赡养老人每月 3000、房贷利息每月 1000 等，年化后填入）。
        </Text>
      </Card>
    </Page>
  );
}

function fmt(v: number): string {
  return Math.round(v * 100 / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const st = StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

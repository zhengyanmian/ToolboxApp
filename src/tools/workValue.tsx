import React, { useState } from 'react';
import { Page, Card, Field, Result, Row, C } from '../ui';
import { View, Text } from 'react-native';

export default function WorkValue({ onBack }: { onBack: () => void }) {
  const [salary, setSalary] = useState('');
  const [commute, setCommute] = useState('1');
  const [slack, setSlack] = useState('2');
  const [edu, setEdu] = useState('1.0');

  const mSalary = parseFloat(salary);
  const valid = mSalary > 0 && !isNaN(mSalary);
  // 网络流传版本：性价比 = 日薪 ÷ [35.5 × (1 + 2×通勤时长 + 摸鱼时长)] × 学历系数
  const daily = valid ? (mSalary * 12) / 250 : 0;
  const denom = valid ? 35.5 * (1 + 2 * (parseFloat(commute) || 0) + (parseFloat(slack) || 0)) : 0;
  const score = valid && denom > 0 ? (daily / denom) * (parseFloat(edu) || 1) : 0;

  let level = '';
  let color = C.sub;
  if (valid) {
    if (score < 0.8) {
      level = '惨绝人寰'; color = C.warn;
    } else if (score < 1.2) {
      level = '勉强糊口'; color = '#f97316';
    } else if (score < 1.6) {
      level = '一般般啦'; color = '#eab308';
    } else if (score < 2.0) {
      level = '令人羡慕'; color = C.ok;
    } else {
      level = '神仙工作'; color = C.ok;
    }
  }

  return (
    <Page id="workvalue" title="工作性价比" onBack={onBack}>
      <Card>
        <Field label="月薪资（元）" value={salary} onChange={setSalary} keyboardType="numeric" placeholder="税前到手都行，口径自己统一" />
        <Field label="日均通勤时长（小时，往返合计）" value={commute} onChange={setCommute} keyboardType="numeric" />
        <Field label="日均摸鱼时长（小时）" value={slack} onChange={setSlack} keyboardType="numeric" />
        <Field label="学历系数（专科 0.8 / 本科 1.0 / 硕士 1.2 / 博士 1.6）" value={edu} onChange={setEdu} keyboardType="numeric" />
      </Card>
      {valid && (
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Text style={{ fontSize: 13, color: C.sub }}>工作性价比</Text>
          <Text style={{ fontSize: 52, fontWeight: '800', color, fontVariant: ['tabular-nums'] as any }}>
            {score.toFixed(2)}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color, marginTop: 4 }}>{level}</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
            <Result label="日均薪资" value={`¥${daily.toFixed(0)}`} />
            <Result label="公式" value={`日薪 ${daily.toFixed(0)} ÷ [35.5 × (1+2×${commute}+${slack})] × ${edu}`} />
          </View>
        </Card>
      )}
      <Card>
        <Text style={{ fontSize: 12, color: C.sub, lineHeight: 19 }}>
          采用网络流传的「工作性价比」公式（网易数读版），纯属娱乐参考：数字低不代表人生失败，数字高也可能明天裁员。日薪按（月薪 × 12 ÷ 250 工作日）估算。
        </Text>
      </Card>
    </Page>
  );
}

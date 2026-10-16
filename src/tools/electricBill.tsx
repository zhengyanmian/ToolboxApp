import React, { useState } from 'react';
import { Page, Card, Field, Result, C } from '../ui';
import { Text, StyleSheet } from 'react-native';

export default function ElectricBill({ onBack }: { onBack: () => void }) {
  const [watt, setWatt] = useState('1500');
  const [hours, setHours] = useState('2');
  const [days, setDays] = useState('30');
  const [price, setPrice] = useState('0.55');

  const w = parseFloat(watt) || 0;        // 瓦
  const h = parseFloat(hours) || 0;       // 每天 小时
  const n = parseFloat(days) || 0;        // 每月 天
  const p = parseFloat(price) || 0;       // 元/度

  const kWhDay = (w * h) / 1000;          // 每天度数
  const kWhMonth = kWhDay * n;
  const costMonth = kWhMonth * p;
  const costYear = costMonth * 12;

  return (
    <Page id="electric" title="电费计算" onBack={onBack}>
      <Card>
        <Field label="电器功率（瓦 W）" value={watt} onChange={setWatt} keyboardType="decimal-pad" placeholder="如空调 1500、电热水壶 800" />
        <Field label="每天使用（小时）" value={hours} onChange={setHours} keyboardType="decimal-pad" />
        <Field label="计算周期（天）" value={days} onChange={setDays} keyboardType="decimal-pad" />
        <Field label="电价（元/度）" value={price} onChange={setPrice} keyboardType="decimal-pad" placeholder="居民电价一般 0.5~0.6" />
      </Card>
      <Card>
        <Result label="每天耗电" value={`${kWhDay.toFixed(2)} 度`} />
        <Result label={`每 ${Math.round(n)} 天耗电`} value={`${kWhMonth.toFixed(2)} 度`} />
        <Result label={`每 ${Math.round(n)} 天电费`} value={`¥${costMonth.toFixed(2)}`} />
        <Result label="折算全年电费" value={`¥${costYear.toFixed(2)}`} />
      </Card>
      <Card>
        <Text style={st.tip}>
          1 度电 = 1000 瓦使用 1 小时。电价按当地居民阶梯电价填写，结果为估算值。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Btn, Result, Row, C } from '../ui';

export default function Stats({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const nums = input
    .split(/[\s,，、;；\n]+/)
    .map((x) => parseFloat(x))
    .filter((x) => !isNaN(x));

  let out: { k: string; v: string }[] = [];
  if (nums.length) {
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    const sampleVar =
      nums.length > 1
        ? nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1)
        : 0;
    // 众数
    const freq = new Map<number, number>();
    nums.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1));
    const maxF = Math.max(...freq.values());
    const modes = [...freq.entries()].filter(([, f]) => f === maxF).map(([n]) => n);
    out = [
      { k: '个数', v: String(nums.length) },
      { k: '总和', v: fmt(sum) },
      { k: '平均数', v: fmt(mean) },
      { k: '中位数', v: fmt(median) },
      { k: '众数', v: maxF > 1 ? modes.slice(0, 5).map(fmt).join('、') : '无' },
      { k: '最大值', v: fmt(sorted[sorted.length - 1]) },
      { k: '最小值', v: fmt(sorted[0]) },
      { k: '方差（总体）', v: fmt(variance) },
      { k: '标准差（总体）', v: fmt(Math.sqrt(variance)) },
      { k: '样本方差', v: fmt(sampleVar) },
      { k: '样本标准差', v: fmt(Math.sqrt(sampleVar)) },
    ];
  }

  return (
    <Page id="stats" title="统计计算器" onBack={onBack}>
      <Card>
        <Field
          label="输入一组数字（空格 / 逗号 / 换行分隔）"
          value={input}
          onChange={setInput}
          multiline
          placeholder="例如：85 92 78 90 88"
        />
        <Btn text="计算" onPress={() => setInput(input.trim())} />
      </Card>
      {out.length > 0 && (
        <Card>
          {out.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      )}
    </Page>
  );
}

function fmt(n: number): string {
  if (!isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e6) / 1e6);
}

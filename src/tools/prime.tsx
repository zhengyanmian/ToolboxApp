import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Btn, Result, Row, C, dynStyles} from '../ui';

function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

function factorize(n: number): number[] {
  const fs: number[] = [];
  let x = Math.abs(Math.trunc(n));
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { fs.push(p); x /= p; }
  if (x > 1) fs.push(x);
  return fs;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export default function Prime({ onBack }: { onBack: () => void }) {
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [res, setRes] = useState<{ k: string; v: string }[]>([]);
  const [err, setErr] = useState('');

  const run = () => {
    setErr('');
    setRes([]);
    const a = Number(n1);
    if (!Number.isInteger(a) || Math.abs(a) > 1e12) {
      setErr('请输入一个绝对值不超过 1 万亿的整数');
      return;
    }
    const rows: { k: string; v: string }[] = [];
    rows.push({ k: `${a} 是否质数`, v: isPrime(a) ? '是' : '否' });
    if (!isPrime(a) && Math.abs(a) > 1) {
      const fs = factorize(a);
      const grouped = group(fs);
      rows.push({ k: '质因数分解', v: grouped.map((g) => `${g.p}^${g.c}`).join(' × ') || '1 无分解' });
    }
    const b = Number(n2);
    if (n2.trim() && Number.isInteger(b) && b !== 0) {
      const g = gcd(a, b);
      rows.push({ k: '最大公约数', v: String(g) });
      rows.push({ k: '最小公倍数', v: String(Math.abs((a * b) / g)) });
    }
    setRes(rows);
  };

  return (
    <Page id="prime" title="质数与因数" onBack={onBack}>
      <Card>
        <Field label="整数" value={n1} onChange={setN1} keyboardType="numbers-and-punctuation" placeholder="例如 2024" />
        <Field label="第二个整数（可选，算最大公约数/最小公倍数）" value={n2} onChange={setN2} keyboardType="numbers-and-punctuation" placeholder="例如 1024" />
        {err ? <Text style={st.err}>{err}</Text> : null}
        <Btn text="计算" onPress={run} />
      </Card>
      {res.length > 0 && (
        <Card>
          {res.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      )}
    </Page>
  );
}

function group(fs: number[]) {
  const m = new Map<number, number>();
  fs.forEach((p) => m.set(p, (m.get(p) || 0) + 1));
  return [...m.entries()].map(([p, c]) => ({ p, c })).sort((a, b) => a.p - b.p);
}

const st = dynStyles((C) => StyleSheet.create({ err: { color: C.warn, fontSize: 13, marginBottom: 8 } }));;

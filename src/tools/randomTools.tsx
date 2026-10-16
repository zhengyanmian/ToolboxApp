import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C, dynStyles} from '../ui';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

export default function RandomTools({ onBack }: { onBack: () => void }) {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [unique, setUnique] = useState(false);
  const [nums, setNums] = useState<number[]>([]);

  const [pwLen, setPwLen] = useState('16');
  const [pwUpper, setPwUpper] = useState(true);
  const [pwLower, setPwLower] = useState(true);
  const [pwDigit, setPwDigit] = useState(true);
  const [pwSymbol, setPwSymbol] = useState(true);
  const [pw, setPw] = useState('');

  function genNums() {
    const a = parseInt(min, 10);
    const b = parseInt(max, 10);
    const n = Math.max(1, Math.min(1000, parseInt(count, 10) || 1));
    if (isNaN(a) || isNaN(b) || a > b) return;
    if (unique && n > b - a + 1) return;
    const res: number[] = [];
    const used = new Set<number>();
    while (res.length < n) {
      const v = a + Math.floor(Math.random() * (b - a + 1));
      if (unique) {
        if (used.has(v)) continue;
        used.add(v);
      }
      res.push(v);
    }
    setNums(res);
  }

  function genPw() {
    let pool = '';
    if (pwUpper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pwLower) pool += 'abcdefghijklmnopqrstuvwxyz';
    if (pwDigit) pool += '0123456789';
    if (pwSymbol) pool += '!@#$%^&*()-_=+[]{};:,.<>?';
    if (!pool) return;
    const len = Math.max(4, Math.min(64, parseInt(pwLen, 10) || 16));
    // 优先用 crypto 随机，失败则退回 Math.random
    const bytes = new Uint8Array(len * 2);
    const g = globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => void } };
    g.crypto?.getRandomValues?.(bytes);
    let s = '';
    for (let i = 0; i < len; i++) {
      const r = bytes[i] !== undefined ? bytes[i] : Math.floor(Math.random() * 256);
      s += pool[r % pool.length];
    }
    setPw(s);
  }

  return (
    <Page id="random" title="随机数 / 密码" onBack={onBack}>
      <Card>
        <Text style={st.sec}>随机数</Text>
        <Field label="最小值" value={min} onChange={setMin} keyboardType="numbers-and-punctuation" />
        <Field label="最大值" value={max} onChange={setMax} keyboardType="numbers-and-punctuation" />
        <Field label="生成个数" value={count} onChange={setCount} keyboardType="numbers-and-punctuation" />
        <TouchableOpacity style={st.chkRow} onPress={() => setUnique(!unique)}>
          <View style={[st.box, unique && st.boxOn]} />
          <Text style={st.chkText}>不重复</Text>
        </TouchableOpacity>
        <Row>
          <Btn text="生成" onPress={genNums} />
        </Row>
        {nums.length > 0 && (
          <Text style={st.nums} selectable>{nums.join(', ')}</Text>
        )}
      </Card>

      <Card>
        <Text style={st.sec}>随机密码</Text>
        <Field label="密码长度" value={pwLen} onChange={setPwLen} keyboardType="numbers-and-punctuation" />
        <View style={st.chkGrid}>
          <Check label="大写字母" on={pwUpper} set={setPwUpper} />
          <Check label="小写字母" on={pwLower} set={setPwLower} />
          <Check label="数字" on={pwDigit} set={setPwDigit} />
          <Check label="特殊符号" on={pwSymbol} set={setPwSymbol} />
        </View>
        <Row>
          <Btn text="生成密码" onPress={genPw} />
        </Row>
        {pw && <Text style={st.pw} selectable>{pw}</Text>}
      </Card>
    </Page>
  );
}

function Check(props: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={st.chkRow} onPress={() => props.set(!props.on)}>
      <View style={[st.box, props.on && st.boxOn]} />
      <Text style={st.chkText}>{props.label}</Text>
    </TouchableOpacity>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  sec: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
  chkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  box: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 2,
    borderColor: C.sub, marginRight: 8,
  },
  boxOn: { backgroundColor: C.primary, borderColor: C.primary },
  chkText: { fontSize: 14, color: C.text },
  nums: { marginTop: 12, fontSize: 16, color: C.primary, fontWeight: '600', lineHeight: 24 },
  pw: {
    marginTop: 12, fontSize: 18, color: C.primary, fontWeight: '700',
    letterSpacing: 1,
  },
}));;

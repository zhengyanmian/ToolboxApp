import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Btn, Result, Row, C, dynStyles} from '../ui';

const DIG = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const UNITS = ['', '拾', '佰', '仟'];
const GROUPS = ['', '万', '亿', '兆'];

function fourToCN(n: number, trimHead: boolean): string {
  let s = '';
  let zero = false;
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(n / 10 ** i) % 10;
    if (d === 0) {
      zero = s.length > 0;
    } else {
      if (zero && s.length) s += '零';
      s += DIG[d] + UNITS[i];
      zero = false;
    }
  }
  return s;
}

export function toRMBUpper(numStr: string): string {
  const neg = numStr.trim().startsWith('-');
  let x = numStr.replace(/[-,+，\s]/g, '');
  if (!/^\d*(\.\d*)?$/.test(x) || x === '' || x === '.') return '';
  const [intPart, decPart = ''] = x.split('.');
  let n = parseInt(intPart || '0', 10);
  if (n > 9999999999999999) return '';

  // 整数部分按 4 位分组
  const groups: number[] = [];
  if (n === 0) groups.push(0);
  while (n > 0) { groups.push(n % 10000); n = Math.floor(n / 10000); }

  let intCN = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    intCN += fourToCN(groups[i], i < groups.length - 1) + (GROUPS[i] || '');
  }
  if (!intCN) intCN = '零';

  // 小数部分：角、分
  const jiao = parseInt(decPart[0] || '0', 10);
  const fen = parseInt(decPart[1] || '0', 10);
  let decCN = '';
  if (jiao === 0 && fen === 0) {
    decCN = '整';
  } else {
    if (jiao > 0) decCN += DIG[jiao] + '角';
    else if (fen > 0 && intCN !== '零') decCN += '零';
    if (fen > 0) decCN += DIG[fen] + '分';
    else if (jiao > 0) decCN += '整';
  }

  return (neg ? '负' : '') + '人民币' + intCN + '元' + decCN;
}

export default function RmbUpper({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const out = toRMBUpper(input);
  return (
    <Page id="rmb" title="人民币大写" onBack={onBack}>
      <Card>
        <Field
          label="金额（数字）"
          value={input}
          onChange={setInput}
          keyboardType="numbers-and-punctuation"
          placeholder="例如 1234567.89"
        />
        {input ? (
          <View style={st.box}>
            <Text style={st.out} selectable>{out || '格式不正确'}</Text>
          </View>
        ) : null}
      </Card>
      <Card>
        <Text style={st.tip}>用于合同、票据的中文大写金额。标准写法：零壹贰叁肆伍陆柒捌玖 + 拾佰仟万亿，角分后无数字写「整」。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  box: { backgroundColor: C.bg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.line },
  out: { fontSize: 16, fontWeight: '700', color: C.text, lineHeight: 24 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

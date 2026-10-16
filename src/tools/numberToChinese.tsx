import React, { useState } from 'react';
import { Page, Card, Field, Result, Btn, Row, dynStyles} from '../ui';

const DIGITS_LOW = '零一二三四五六七八九';
const DIGITS_UP = '零壹贰叁肆伍陆柒捌玖';
const UNITS_LOW = ['', '十', '百', '千'];
const UNITS_UP = ['', '拾', '佰', '仟'];
const GROUPS_LOW = ['', '万', '亿', '万亿'];
const GROUPS_UP = ['', '万', '亿', '万亿'];

function fourDigits(n: number, digits: string, units: string[]): string {
  let s = '';
  let zero = false;
  for (let i = 3; i >= 0; i--) {
    const d = Math.floor(n / 10 ** i) % 10;
    if (d === 0) {
      zero = s.length > 0;
    } else {
      if (zero) s += '零';
      // 一十X → 十X（低位读法）
      if (d === 1 && i === 1 && s.length === 0) s += '';
      else s += digits[d];
      s += units[i];
      zero = false;
    }
  }
  return s;
}

function convertInt(intStr: string, upper: boolean): string {
  const digits = upper ? DIGITS_UP : DIGITS_LOW;
  const units = upper ? UNITS_UP : UNITS_LOW;
  const groups = upper ? GROUPS_UP : GROUPS_LOW;
  // 按每 4 位一组从低位到高位
  const parts: string[] = [];
  let rest = intStr;
  while (rest.length > 0) {
    parts.unshift(rest.slice(-4));
    rest = rest.slice(0, -4);
  }
  let out = '';
  for (let g = 0; g < parts.length; g++) {
    const n = parseInt(parts[g], 10);
    const gi = parts.length - 1 - g;
    if (n === 0) {
      if (out && !out.endsWith('零')) out += '零';
      continue;
    }
    const segText = fourDigits(n, digits, units);
    if (n < 1000 && g > 0 && out && !out.endsWith('零')) out += '零';
    out += segText + groups[gi];
  }
  return out || digits[0];
}

export default function NumberToChinese({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [upper, setUpper] = useState(false);

  const trimmed = input.trim().replace(/[,\s，]/g, '');
  let result = '';
  let note = '';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const neg = trimmed.startsWith('-');
    const [intPart, decPart] = trimmed.replace(/^-/, '').split('.');
    if (intPart.length > 16) {
      note = '整数位过长（最多 16 位）';
    } else {
      const cnInt = convertInt(intPart, upper);
      const d = upper ? DIGITS_UP : DIGITS_LOW;
      let cnDec = '';
      if (decPart) {
        cnDec = '点' + decPart
          .split('')
          .map((c) => d[+c] ?? '')
          .join('');
      }
      result = (neg ? '负' : '') + (intPart === '0' && !decPart ? d[0] : cnInt) + cnDec;
    }
  } else if (trimmed) {
    note = '请输入合法数字';
  }

  return (
    <Page id="numcn" title="数字转中文" onBack={onBack}>
      <Card>
        <Field
          label="数字"
          value={input}
          onChange={setInput}
          keyboardType="numbers-and-punctuation"
          placeholder="如 1234567.89"
        />
        <Row>
          <Btn text={upper ? '大写（壹贰叁）' : '小写（一二三）'} onPress={() => setUpper(!upper)} />
        </Row>
        {result ? <Result label="中文读法" value={result} copyable /> : null}
        {note ? <TextNote>{note}</TextNote> : null}
      </Card>
      <Card>
        <TextNote>
          整数部分按中文数字规范读法（含万、亿分级），小数部分逐位读出。大写模式用于票据防篡改场景。
        </TextNote>
      </Card>
    </Page>
  );
}

function TextNote(props: { children: React.ReactNode }) {
  const { Text, StyleSheet } = require('react-native');
  return <Text style={noteSt.t}>{props.children}</Text>;
}

const noteSt = dynStyles((C) => ({ t: { fontSize: 12, color: C.sub, lineHeight: 18 } }));;

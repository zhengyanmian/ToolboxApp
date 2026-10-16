import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C, dynStyles} from '../ui';
import { Text, StyleSheet } from 'react-native';

// 国际摩斯电码表（公共领域数据）
const TO_MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.',
  h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.',
  o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-',
  v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
  '@': '.--.-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
};

const FROM_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(TO_MORSE).map(([k, v]) => [v, k]),
);

function encode(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      [...word].map((ch) => TO_MORSE[ch] ?? '').filter(Boolean).join(' '),
    )
    .filter(Boolean)
    .join(' / ');
}

function decode(s: string): string {
  return s
    .trim()
    .split('/')
    .map((word) =>
      word.trim().split(/\s+/).map((code) => FROM_MORSE[code] ?? '').join(''),
    )
    .join(' ');
}

export default function Morse({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [mode, setMode] = useState<'enc' | 'dec'>('enc');

  function run(kind: 'enc' | 'dec') {
    setMode(kind);
    setOut(kind === 'enc' ? encode(input) : decode(input));
  }

  return (
    <Page id="morse" title="摩斯电码" onBack={onBack}>
      <Card>
        <Field
          label={mode === 'enc' ? '明文（字母/数字）' : '摩斯码（. 和 -，词间用 / 分隔）'}
          value={input}
          onChange={setInput}
          multiline
          placeholder={mode === 'enc' ? 'hello 123' : '.... . .-.. .-.. ---'}
        />
        <Row>
          <Btn text="→ 编码" onPress={() => run('enc')} />
          <Btn text="← 解码" onPress={() => run('dec')} />
        </Row>
      </Card>
      {out !== '' && (
        <Card>
          <Text style={st.outTitle}>结果（长按可复制）</Text>
          <Text style={st.out} selectable>{out}</Text>
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          支持英文字母 A-Z、数字 0-9 和常见标点。编码时单词之间用" / "分隔，解码时自动识别。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  outTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  out: { fontSize: 14, color: C.text, lineHeight: 20 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

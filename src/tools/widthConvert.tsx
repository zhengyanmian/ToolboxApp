import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Result, Row, C, dynStyles} from '../ui';

// 全角 <-> 半角（ASCII 区）
function toHalf(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0x3000) out += ' '; // 全角空格
    else if (c >= 0xff01 && c <= 0xff5e) out += String.fromCharCode(c - 0xfee0);
    else out += ch;
  }
  return out;
}

function toFull(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0x20) out += '\u3000';
    else if (c >= 0x21 && c <= 0x7e) out += String.fromCharCode(c + 0xfee0);
    else out += ch;
  }
  return out;
}

export default function WidthConvert({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const s = input;
  return (
    <Page id="width" title="全角半角转换" onBack={onBack}>
      <Card>
        <Field
          label="输入文本"
          value={input}
          onChange={setInput}
          multiline
          placeholder="例如：ＡＢＣ１２３ 或 ABC123"
        />
        {s ? (
          <>
            <Result label="转半角" value={toHalf(s)} />
            <Result label="转全角" value={toFull(s)} />
          </>
        ) : null}
      </Card>
      <Card>
        <Text style={st.tip}>全角：ＡＢＣ１２３（占一个汉字宽）；半角：ABC123（占半个汉字宽）。中文输入法常打出全角标点，代码/搜索场景需要转半角。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({ tip: { fontSize: 12, color: C.sub, lineHeight: 18 } }));;

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Result, Row, C, dynStyles} from '../ui';

function toUnicode(s: string): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    out += cp > 127 ? '\\u' + cp.toString(16).padStart(4, '0') : ch;
  }
  return out;
}

function toHtmlEntities(s: string): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (/[&<>"']/.test(ch)) out += '&' + ({ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' } as any)[ch] + ';';
    else if (cp > 127) out += '&#' + cp + ';';
    else out += ch;
  }
  return out;
}

function fromUnicode(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function fromHtmlEntities(s: string): string {
  const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" };
  return s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => named[m] ?? m);
}

function toCodePoints(s: string): string {
  return [...s].map((ch) => 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
}

export default function Unicode({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [enc, setEnc] = useState('');
  const s = input;

  return (
    <Page id="unicode" title="Unicode / HTML 实体" onBack={onBack}>
      <Card>
        <Field
          label="要编码的文本"
          value={input}
          onChange={setInput}
          multiline
          placeholder="例如：Hello 你好"
        />
        {s ? (
          <>
            <Result label="\\u 转义" value={toUnicode(s)} />
            <Result label="HTML 实体" value={toHtmlEntities(s)} />
            <Result label="码位" value={toCodePoints(s)} />
          </>
        ) : null}
      </Card>
      <Card>
        <Field
          label="要解码的内容（\\uXXXX / &#xHH; / &#NNN; / &amp; 等）"
          value={enc}
          onChange={setEnc}
          multiline
          placeholder={'例如：\\u4f60\\u597d 或 &#20320;&#22909;'}
        />
        {enc ? <Result label="解码结果" value={fromHtmlEntities(fromUnicode(enc))} /> : null}
      </Card>
      <Card>
        <Text style={st.tip}>\\u 转义常见于 JS/Java 源码与配置文件；HTML 实体常见于网页源码。解码支持三种格式混合，自动识别。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({ tip: { fontSize: 12, color: C.sub, lineHeight: 18 } }));;

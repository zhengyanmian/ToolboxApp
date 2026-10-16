import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Tab = 'b64' | 'url';

// UTF-8 安全的 Base64 编解码（手写，不依赖 btoa/Buffer）
const B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Encode(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.codePointAt(i)!;
    if (c > 0xffff) i++; // 代理对
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    } else if (c < 0x10000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    } else {
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

function b64Encode(s: string): string {
  const bytes = utf8Encode(s);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i], b2 = bytes[i + 1], b3 = bytes[i + 2];
    out += B64C[b1 >> 2];
    out += B64C[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    out += b2 === undefined ? '=' : B64C[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    out += b3 === undefined ? '=' : B64C[b3 & 63];
  }
  return out;
}

function b64Decode(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => B64C.indexOf(clean[i + k] ?? '='));
    bytes.push((n[0] << 2) | (n[1] >> 4));
    if (n[2] >= 0) bytes.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (n[3] >= 0) bytes.push(((n[2] & 3) << 6) | n[3]);
  }
  // UTF-8 解码
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) { out += String.fromCharCode(b); i++; }
    else if (b < 0xe0) { out += String.fromCharCode(((b & 31) << 6) | (bytes[i + 1] & 63)); i += 2; }
    else if (b < 0xf0) {
      out += String.fromCharCode(((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63));
      i += 3;
    } else {
      const cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      out += String.fromCodePoint(cp);
      i += 4;
    }
  }
  return out;
}

export default function Codec({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('b64');
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');

  function run(kind: 'enc' | 'dec') {
    setErr('');
    setOut('');
    try {
      if (tab === 'b64') {
        setOut(kind === 'enc' ? b64Encode(input) : b64Decode(input));
      } else {
        setOut(kind === 'enc' ? encodeURIComponent(input) : decodeURIComponent(input));
      }
    } catch {
      setErr('解码失败：输入内容不是合法的编码文本');
    }
  }

  return (
    <Page id="codec" title="编解码工具" onBack={onBack}>
      <View style={st.tabs}>
        {([['b64', 'Base64'], ['url', 'URL']] as [Tab, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            style={[st.tab, tab === t && st.tabOn]}
            onPress={() => { setTab(t); setOut(''); setErr(''); }}>
            <Text style={[st.tabText, tab === t && st.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Card>
        <Field label="输入" value={input} onChange={setInput} multiline placeholder="要编码或解码的内容" />
        <Row>
          <Btn text="编码 →" onPress={() => run('enc')} />
          <Btn text="← 解码" onPress={() => run('dec')} />
        </Row>
      </Card>
      {err ? <Card><Text style={st.err}>{err}</Text></Card> : null}
      {out !== '' && (
        <Card>
          <Text style={st.outTitle}>结果（长按可复制）</Text>
          <Text style={st.out} selectable>{out}</Text>
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          Base64 常用于文本/图片数据的转码传输；URL 编码用于把中文、空格等特殊字符转成链接安全格式。全部本地处理。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.cardSolid, borderWidth: 1, borderColor: C.line,
  },
  tabOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  tabText: { fontSize: 14, color: C.sub },
  tabTextOn: { color: C.primary, fontWeight: '600' },
  outTitle: { fontSize: 13, color: C.sub, marginBottom: 6 },
  out: { fontSize: 14, color: C.text, lineHeight: 20 },
  err: { color: C.warn, fontSize: 13 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

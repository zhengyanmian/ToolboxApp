import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import md5Lib from 'js-md5';
import sha1Lib from 'js-sha1';
import sha256Lib from 'js-sha256';
import { Page, Card, Field, Btn, Result, Row, C, dynStyles} from '../ui';

// js-* 库在 Hermes 下可能暴露为 hexdigest 函数或对象，做一层兼容
function digest(lib: any, text: string): string {
  try {
    if (typeof lib === 'function') return lib(text);
    if (typeof lib.hex === 'function') return lib.hex(text);
    if (typeof lib === 'string') return lib;
    if (lib.arrayBuffer) return lib.create ? lib.create().update(text).hex() : String(lib(text));
    return String(lib(text));
  } catch (e) {
    return '计算失败';
  }
}

export default function Hash({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const text = input;
  return (
    <Page id="hash" title="哈希计算" onBack={onBack}>
      <Card>
        <Field
          label="输入文本（支持中文，按 UTF-8 计算）"
          value={input}
          onChange={setInput}
          multiline
          placeholder="输入要计算哈希的内容"
        />
      </Card>
      {text ? (
        <Card>
          <Result label="MD5" value={digest(md5Lib, text)} />
          <Result label="SHA-1" value={digest(sha1Lib, text)} />
          <Result label="SHA-256" value={digest(sha256Lib, text)} />
        </Card>
      ) : null}
      <Card>
        <Text style={st.tip}>哈希是单向指纹，用于校验内容是否被篡改。相同内容哈希必相同，仅大小写/空格差异哈希也会完全不同。纯本地计算。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({ tip: { fontSize: 12, color: C.sub, lineHeight: 18 } }));;

import React, { useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Field, Result, Btn, Row, C } from '../ui';

function rc4crypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  // KSA
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
  }
  // PRGA
  const out = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 0xff;
    j = (j + s[i]) & 0xff;
    const t = s[i];
    s[i] = s[j];
    s[j] = t;
    out[k] = data[k] ^ s[(s[i] + s[j]) & 0xff];
  }
  return out;
}

function utf8Encode(str: string): Uint8Array {
  const out: number[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 63),
        0x80 | ((cp >> 6) & 63),
        0x80 | (cp & 63),
      );
  }
  return new Uint8Array(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b < 0xe0) {
      cp = ((b & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (b < 0xf0) {
      cp = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      cp =
        ((b & 7) << 18) |
        ((bytes[i + 1] & 63) << 12) |
        ((bytes[i + 2] & 63) << 6) |
        (bytes[i + 3] & 63);
      i += 4;
    }
    s += String.fromCodePoint(cp);
  }
  return s;
}

function toHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
function fromHex(h: string): Uint8Array {
  const clean = h.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
const B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toB64(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const b1 = b[i], b2 = b[i + 1], b3 = b[i + 2];
    out += B64C[b1 >> 2];
    out += B64C[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    out += b2 === undefined ? '=' : B64C[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    out += b3 === undefined ? '=' : B64C[b3 & 63];
  }
  return out;
}
function fromB64(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map((k) => B64C.indexOf(clean[i + k] ?? 'A'));
    out.push((n[0] << 2) | (n[1] >> 4));
    if (clean[i + 2] !== undefined && clean[i + 2] !== '=') out.push(((n[1] & 15) << 4) | (n[2] >> 2));
    if (clean[i + 3] !== undefined && clean[i + 3] !== '=') out.push(((n[2] & 3) << 6) | n[3]);
  }
  return new Uint8Array(out);
}

export default function Rc4Tool({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'enc' | 'dec'>('enc');
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [outFmt, setOutFmt] = useState<'hex' | 'b64'>('hex');

  let result = '';
  let err = '';
  try {
    if (text && key) {
      if (mode === 'enc') {
        const out = rc4crypt(utf8Encode(text), utf8Encode(key));
        result = outFmt === 'hex' ? toHex(out) : toB64(out);
      } else {
        const raw = outFmt === 'hex' ? fromHex(text) : fromB64(text);
        if (!raw.length && text.trim()) err = '密文格式不正确';
        else result = utf8Decode(rc4crypt(raw, utf8Encode(key)));
      }
    }
  } catch {
    err = '解密失败：密文或密钥不正确';
  }

  return (
    <Page id="rc4" title="RC4 加密" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="加密" kind={mode === 'enc' ? 'primary' : 'plain'} onPress={() => setMode('enc')} />
          <Btn text="解密" kind={mode === 'dec' ? 'primary' : 'plain'} onPress={() => setMode('dec')} />
          {mode === 'enc' && (
            <Btn
              text={outFmt === 'hex' ? 'Hex 输出' : 'Base64 输出'}
              onPress={() => setOutFmt(outFmt === 'hex' ? 'b64' : 'hex')}
            />
          )}
        </Row>
      </Card>
      <Card>
        <Field label="密钥" value={key} onChange={setKey} placeholder="加密解密必须同一密钥" />
        <Field
          label={mode === 'enc' ? '明文' : '密文'}
          value={text}
          onChange={setText}
          multiline
        />
        {result ? <Result label={mode === 'enc' ? '密文' : '明文'} value={result} copyable /> : null}
        {err ? <Text style={{ color: C.warn, fontSize: 13, marginTop: 8 }}>{err}</Text> : null}
      </Card>
    </Page>
  );
}

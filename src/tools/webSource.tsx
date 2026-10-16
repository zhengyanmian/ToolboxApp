import React, { useState } from 'react';
import { Text, ScrollView } from 'react-native';
import { Page, Card, Field, Btn, Row, Result, KV, C } from '../ui';

export default function WebSource({ onBack }: { onBack: () => void }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [ctype, setCtype] = useState('');
  const [body, setBody] = useState('');
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const fetchSrc = async () => {
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    setUrl(u);
    setErr('');
    setBusy(true);
    setBody('');
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (ToolboxApp)' } });
      setStatus(res.status);
      setCtype(res.headers.get('content-type') ?? '');
      const text = await res.text();
      setTotal(text.length);
      setBody(text.slice(0, 20000));
    } catch (e: any) {
      setErr(e?.message || '请求失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="websrc" title="网页源码" onBack={onBack}>
      <Card>
        <Field label="网址" value={url} onChange={setUrl} placeholder="example.com" />
        <Row>
          <Btn text={busy ? '请求中…' : '获取源码'} kind="primary" onPress={fetchSrc} />
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {status !== null && (
        <Card>
          <KV k="状态码" v={String(status)} />
          <KV k="Content-Type" v={ctype || '—'} />
          <KV k="总长度" v={`${total.toLocaleString()} 字符（下方显示前 2 万）`} />
        </Card>
      )}
      {body ? (
        <Card>
          <Result label="源码预览" value={body.slice(0, 200)} />
          <ScrollView style={st.box}>
            <Text style={st.code}>{body}</Text>
          </ScrollView>
        </Card>
      ) : null}
    </Page>
  );
}

const st = {
  err: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  box: { maxHeight: 300, marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 8, padding: 8 },
  code: { fontSize: 11, color: '#334155' },
};

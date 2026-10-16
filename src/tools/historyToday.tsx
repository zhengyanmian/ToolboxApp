import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';

type Ev = { year?: number | string; text: string };

export default function HistoryToday({ onBack }: { onBack: () => void }) {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    setBusy(true);
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      let list: Ev[] = [];
      try {
        const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`);
        const j = await res.json();
        list = (j.events ?? []).map((e: any) => ({ year: e.year, text: e.text }));
      } catch {
        const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`);
        const j = await res.json();
        list = (j.events ?? []).map((e: any) => ({ year: e.year, text: e.text }));
      }
      list.sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0));
      if (!list.length) throw new Error('今天没有收录的历史事件');
      setEvents(list);
    } catch (e: any) {
      setErr(e?.message || '获取失败，请检查网络（需要能访问维基百科）');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page id="hoday" title="历史上的今天" onBack={onBack}>
      <Card>
        <Row>
          <Btn text={busy ? '加载中…' : '加载今天的大事'} kind="primary" onPress={load} />
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {events?.map((e, i) => (
        <Card key={i} style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={st.year}>{e.year}</Text>
            <Text style={st.text}>{e.text}</Text>
          </View>
        </Card>
      ))}
      {events && (
        <Card>
          <Text style={st.tip}>共 {events.length} 条 · 数据来自维基百科「历史上的今天」，需能访问维基站点。</Text>
        </Card>
      )}
    </Page>
  );
}

const st = {
  year: { color: C.primary, fontWeight: '800' as const, fontSize: 15, width: 56 },
  text: { color: C.text, fontSize: 14, lineHeight: 21, flex: 1 },
  err: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
};

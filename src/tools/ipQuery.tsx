import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Field, Icon, KV, Page, SectionTitle, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { copyText } from '../native';

type IpInfo = {
  ip: string;
  type?: string;
  country?: string;
  region?: string;
  city?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: any;
  connection?: { isp?: string; org?: string; asn?: number; domain?: string };
};

export default function IpQuery({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [text, setText] = useState('');
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [mine, setMine] = useState<IpInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (host?: string) => {
    const target = (host ?? text).trim();
    setErr('');
    setBusy(true);
    try {
      const u = target ? `https://ipwho.is/${encodeURIComponent(target)}` : 'https://ipwho.is/';
      const res = await fetch(u);
      const j = (await res.json()) as any;
      if (j.success === false) throw new Error(j.message || '查询失败');
      setInfo(j);
      if (!target) setMine(j);
    } catch (e: any) {
      setErr(e?.message || '网络请求失败，请检查网络或换个地址试试');
    } finally {
      setBusy(false);
    }
  };

  const tz = typeof info?.timezone === 'object' ? info?.timezone?.id : info?.timezone;
  const where = [info?.country, info?.region, info?.city].filter(Boolean).join(' · ') || '—';

  return (
    <Page id="ipq" title="IP 查询" onBack={onBack}>
      <Card>
        <Field
          label="输入 IP 或域名（留空则查本机公网 IP）"
          value={text}
          onChange={setText}
          placeholder="例如 8.8.8.8 / baidu.com"
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn
            text={busy ? '查询中…' : '查询'}
            icon="search"
            onPress={() => run()}
            style={{ flex: 2 }}
          />
          <Btn
            text="本机 IP"
            kind="plain"
            icon="globe"
            onPress={() => {
              setText('');
              run('');
            }}
            style={{ flex: 1 }}
          />
        </View>
        {err ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Icon name="info" size={14} color={p.warn} />
            <Text style={[st.err, { color: p.warn }]}>{err}</Text>
          </View>
        ) : null}
      </Card>

      {info ? (
        <Card>
          <SectionTitle
            text="查询结果"
            style={{ marginTop: 0 }}
            right={
              <Tap
                onPress={() => copyText(`${info.ip} ${where}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                hitSlop={8}>
                <Icon name="copy" size={14} color={p.faint} />
                <Text style={{ fontSize: 11.5, color: p.faint }}>复制</Text>
              </Tap>
            }
          />
          <KV k="IP 地址" v={info.ip ?? '—'} />
          <KV k="位置" v={where} />
          <KV k="运营商" v={info.connection?.isp ?? '—'} />
          <KV k="组织" v={info.connection?.org ?? '—'} />
          <KV k="ASN" v={info.connection?.asn ? `AS${info.connection.asn}` : '—'} />
          <KV k="时区" v={tz ?? '—'} />
          <KV
            k="经纬度"
            v={
              typeof info.latitude === 'number' && typeof info.longitude === 'number'
                ? `${info.latitude.toFixed(3)}, ${info.longitude.toFixed(3)}`
                : '—'
            }
          />
        </Card>
      ) : null}

      {mine ? (
        <Card pad={13}>
          <Text style={[st.mineLabel, { color: p.sub }]}>本机公网 IP</Text>
          <Text selectable style={[st.mineIp, { color: p.primary }]}>
            {mine.ip}
          </Text>
        </Card>
      ) : null}

      <Card pad={13}>
        <Text style={[st.tip, { color: p.sub }]}>
          数据来自 ipwho.is 免费 HTTPS 接口，无需密钥，定位到城市级。要算网段、掩码、可用地址范围，请用工具栏里的
          「子网计算器」。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles(() =>
  StyleSheet.create({
    err: { fontSize: 12.5, flex: 1, lineHeight: 18 },
    tip: { fontSize: 12, lineHeight: 18 },
    mineLabel: { fontSize: 11.5, fontWeight: '600' },
    mineIp: { fontSize: 20, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  }),
);

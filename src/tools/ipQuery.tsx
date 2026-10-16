import React, { useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Btn, Row, KV, C, dynStyles} from '../ui';

type IpInfo = {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: any;
  connection?: { isp?: string; org?: string; asn?: number };
  flag?: { emoji?: string };
};

export default function IpQuery({ onBack }: { onBack: () => void }) {
  const [info, setInfo] = useState<IpInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const query = async (host?: string) => {
    setErr('');
    setBusy(true);
    try {
      const u = host ? `https://ipwho.is/${host}` : 'https://ipwho.is/';
      const res = await fetch(u);
      const j = (await res.json()) as any;
      if (j.success === false) throw new Error(j.message || '查询失败');
      setInfo(j);
    } catch (e: any) {
      setErr(e?.message || '网络请求失败，请检查网络');
    } finally {
      setBusy(false);
    }
  };

  const tz = typeof info?.timezone === 'object' ? info?.timezone?.id : info?.timezone;

  return (
    <Page id="ipq" title="IP 查询" onBack={onBack}>
      <Card>
        <Row>
          <Btn text="查我的 IP" kind="primary" onPress={() => query()} />
          <Btn text={busy ? '查询中…' : '刷新'} onPress={() => query(info?.ip)} />
        </Row>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      {info && (
        <Card>
          <KV k="IP 地址" v={info.ip ?? '—'} />
          <KV k="国家/地区" v={`${info.flag?.emoji ?? ''} ${info.country ?? '—'} ${info.region ?? ''}`} />
          <KV k="城市" v={info.city ?? '—'} />
          <KV k="运营商" v={info.connection?.isp ?? '—'} />
          <KV k="组织" v={info.connection?.org ?? '—'} />
          <KV k="ASN" v={info.connection?.asn ? `AS${info.connection.asn}` : '—'} />
          <KV k="时区" v={tz ?? '—'} />
        </Card>
      )}
      <Card>
        <Text style={st.tip}>
          数据来自 ipwho.is 免费接口（HTTPS 直连、无需密钥），定位精确到城市级。查询任意 IP：在浏览器把地址换成 IP 后无法直接输入——下一版会加自定义 IP 输入框。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => ({ err: { color: '#dc2626', fontSize: 13, marginTop: 8 }, tip: { fontSize: 12, color: C.sub, lineHeight: 18 } }));;

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Result, Row, C, dynStyles} from '../ui';

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = parseInt(p, 10);
    if (isNaN(v) || v < 0 || v > 255 || !/^\d{1,3}$/.test(p)) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export default function Subnet({ onBack }: { onBack: () => void }) {
  const [ip, setIp] = useState('192.168.1.100');
  const [mask, setMask] = useState('24');

  const ipN = ipToInt(ip);
  const cidr = parseInt(mask, 10);
  const valid = ipN !== null && Number.isInteger(cidr) && cidr >= 0 && cidr <= 32;

  let rows: { k: string; v: string }[] = [];
  if (valid) {
    const maskN = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
    const network = (ipN & maskN) >>> 0;
    const broadcast = (network | (~maskN >>> 0)) >>> 0;
    const total = 2 ** (32 - cidr);
    const usable = cidr >= 31 ? total : total - 2;
    const first = cidr >= 31 ? network : network + 1;
    const last = cidr >= 31 ? broadcast : broadcast - 1;
    rows = [
      { k: '子网掩码', v: intToIp(maskN) },
      { k: '网络地址', v: intToIp(network) },
      { k: '广播地址', v: intToIp(broadcast) },
      { k: '可用地址数', v: usable.toLocaleString() },
      { k: '可用范围', v: cidr >= 31 ? `${intToIp(first)} ~ ${intToIp(last)}` : `${intToIp(first)} ~ ${intToIp(last)}` },
      { k: '通配符掩码', v: intToIp(~maskN >>> 0) },
      { k: 'CIDR 写法', v: `${intToIp(network)}/${cidr}` },
      { k: 'IP 是否在网段内', v: ipN >= network && ipN <= broadcast ? '是' : '否' },
    ];
  }

  return (
    <Page id="subnet" title="IP 子网计算" onBack={onBack}>
      <Card>
        <Field
          label="IP 地址"
          value={ip}
          onChange={setIp}
          keyboardType="numbers-and-punctuation"
          placeholder="例如 192.168.1.100"
        />
        <Field
          label="掩码位数（CIDR，0~32）"
          value={mask}
          onChange={setMask}
          keyboardType="numbers-and-punctuation"
          placeholder="例如 24"
        />
      </Card>
      {valid ? (
        <Card>
          {rows.map((r) => (
            <Result key={r.k} label={r.k} value={r.v} />
          ))}
        </Card>
      ) : (
        ip || mask ? (
          <Card><Text style={st.err}>IP 或掩码位数格式不正确</Text></Card>
        ) : null
      )}
      <Card>
        <Text style={st.tip}>输入如 192.168.1.100 / 24，自动算出网段、广播地址和可用 IP 范围，常用于路由器配置和网络规划。纯本地计算。</Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  err: { color: C.warn, fontSize: 14 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

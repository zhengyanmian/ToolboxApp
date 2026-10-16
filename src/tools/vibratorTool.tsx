import React from 'react';
import { Page, Card, Btn, Row, C } from '../ui';
import { Text } from 'react-native';
import { nativeVibrate, cancelVibrate } from '../native';

const PATTERNS: { label: string; desc: string; pattern: string }[] = [
  { label: '短震一下', desc: '嗒', pattern: '0,80' },
  { label: '长震', desc: '嗡——', pattern: '0,900' },
  { label: '双击', desc: '嗒-嗒', pattern: '0,80,120,80' },
  { label: '心跳', desc: '咚咚…咚咚', pattern: '0,120,100,120,600,120,100,120' },
  { label: '摩斯 SOS', desc: '···———···', pattern: '0,80,100,80,100,80,200,300,100,300,100,300,200,80,100,80,100,80' },
  { label: '波浪', desc: '渐强三连', pattern: '0,60,80,60,80,200,80,200,80,400' },
];

export default function VibratorTool({ onBack }: { onBack: () => void }) {
  return (
    <Page id="vibrate" title="振动器" onBack={onBack}>
      <Card>
        <Text style={st.tip}>测试手机振动马达。部分机型振动偏弱属正常（转子马达 vs 线性马达差异）。</Text>
        <Row style={{ marginTop: 10 }}>
          <Btn text="停止" kind="primary" onPress={cancelVibrate} />
        </Row>
      </Card>
      {PATTERNS.map((p) => (
        <Card key={p.label} style={{ paddingVertical: 12 }}>
          <Text style={st.name}>{p.label}</Text>
          <Text style={st.desc}>{p.desc}</Text>
          <Row style={{ marginTop: 6 }}>
            <Btn text="震动" kind="primary" onPress={() => nativeVibrate(p.pattern)} />
          </Row>
        </Card>
      ))}
    </Page>
  );
}

const st = {
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
  name: { fontSize: 15, fontWeight: '600' as const, color: C.text },
  desc: { fontSize: 12, color: C.sub, marginTop: 2 },
};

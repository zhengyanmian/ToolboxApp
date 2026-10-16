import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, Field, Row, C } from '../ui';

type Level = { score: number; label: string; color: string };

function assess(pw: string): Level {
  if (!pw) return { score: 0, label: '—', color: C.sub };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 16 && score >= 4) score++;
  // 常见弱密码惩罚
  const weak = ['123456', 'password', 'qwerty', '111111', '888888', 'abc123', '1234567890'];
  if (weak.some((w) => pw.toLowerCase().includes(w)) || /^(.)\1+$/.test(pw)) score = 1;
  if (score <= 1) return { score, label: '极弱', color: '#dc2626' };
  if (score === 2) return { score, label: '弱', color: '#f97316' };
  if (score === 3) return { score, label: '一般', color: '#eab308' };
  if (score === 4) return { score, label: '强', color: '#16a34a' };
  return { score, label: '极强', color: '#0d9488' };
}

export default function PwStrength({ onBack }: { onBack: () => void }) {
  const [pw, setPw] = useState('');
  const lv = assess(pw);
  const entropy = estimateEntropy(pw);

  return (
    <Page id="pwstrength" title="密码强度检测" onBack={onBack}>
      <Card>
        <Field
          label="输入密码（仅本地计算，不会发送）"
          value={pw}
          onChange={setPw}
          placeholder="输入要检测的密码"
        />
        <View style={st.bars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[st.bar, { backgroundColor: i <= lv.score ? lv.color : C.line }]}
            />
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={[st.label, { color: lv.color }]}>{lv.label}</Text>
          <Text style={st.entropy}>熵约 {entropy} bit</Text>
        </Row>
      </Card>
      <Card>
        <Text style={st.tip}>强度规则：长度 ≥8 / ≥12、含大小写、含数字、含符号各 +1，共 6 档。命中常见弱密码直接降为极弱。完全离线计算。</Text>
      </Card>
    </Page>
  );
}

function estimateEntropy(pw: string): number {
  if (!pw) return 0;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  return Math.round(pw.length * Math.log2(pool || 1));
}

const st = StyleSheet.create({
  bars: { flexDirection: 'row', gap: 6, marginTop: 4 },
  bar: { flex: 1, height: 8, borderRadius: 4 },
  label: { fontSize: 16, fontWeight: '700' },
  entropy: { fontSize: 13, color: C.sub },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

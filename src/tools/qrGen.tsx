import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, C } from '../ui';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import qrcode from 'qrcode-generator';

export default function QrGen({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState('https://github.com/zhengyanmian');
  const [dark, setDark] = useState('#1f2937');

  let modules: boolean[][] | null = null;
  let err = '';
  if (text.trim()) {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      modules = [];
      for (let r = 0; r < qr.getModuleCount(); r++) {
        const row: boolean[] = [];
        for (let c = 0; c < qr.getModuleCount(); c++) row.push(qr.isDark(r, c));
        modules.push(row);
      }
    } catch {
      err = '内容太长，无法生成二维码';
    }
  }

  const n = modules ? modules.length : 0;
  const cell = n > 0 ? Math.floor(280 / n) : 0;
  const size = cell * n;

  return (
    <Page id="qr" title="二维码生成" onBack={onBack}>
      <Card>
        <Field label="内容（链接或文字）" value={text} onChange={setText} multiline />
        <Row>
          <Btn text={dark === '#1f2937' ? '换成蓝紫色' : '换成深灰色'} onPress={() => setDark(dark === '#1f2937' ? '#4338ca' : '#1f2937')} />
        </Row>
      </Card>
      {err ? (
        <Card><Text style={st.err}>{err}</Text></Card>
      ) : modules ? (
        <Card style={{ alignItems: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
            <View
              style={{
                width: size, height: size,
                flexDirection: 'column', flexWrap: 'wrap',
                backgroundColor: '#ffffff', padding: 0,
              }}>
              {modules.flat().map((dark_, i) => (
                <View
                  key={i}
                  style={{
                    width: cell, height: cell,
                    backgroundColor: dark_ ? dark : '#ffffff',
                  }}
                />
              ))}
            </View>
          </ScrollView>
          <Text style={st.tip}>{`版本 ${Math.ceil((n - 17) / 4)} · ${n}×${n} 模块 · 容错等级 M`}</Text>
        </Card>
      ) : null}
      <Card>
        <Text style={st.tip}>
          输入任意文字或链接即可生成二维码，截图保存后即可分享使用。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  tip: { fontSize: 12, color: C.sub, marginTop: 8, textAlign: 'center' },
  err: { color: C.warn, fontSize: 14 },
});

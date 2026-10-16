import React from 'react';
import { Page, Card, C } from '../ui';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';

// 全国通用公共服务电话（公开信息）
const LINES: { name: string; tel: string; desc: string }[] = [
  { name: '报警', tel: '110', desc: '治安、刑事案件' },
  { name: '火警', tel: '119', desc: '火灾、救援' },
  { name: '急救', tel: '120', desc: '医疗急救' },
  { name: '交通事故', tel: '122', desc: '道路交通事故报警' },
  { name: '政务服务', tel: '12345', desc: '政府服务便民热线' },
  { name: '消费投诉', tel: '12315', desc: '市场监管、消费者权益' },
  { name: '铁路客服', tel: '12306', desc: '火车票、列车信息' },
  { name: '民航客服', tel: '12326', desc: '航空出行咨询投诉' },
  { name: '税务服务', tel: '12366', desc: '纳税咨询与投诉' },
  { name: '社保服务', tel: '12333', desc: '人力资源与社会保障' },
  { name: '环保举报', tel: '12369', desc: '生态环境举报' },
  { name: '法律援助', tel: '12348', desc: '公共法律服务' },
  { name: '电力服务', tel: '95598', desc: '国家电网报修缴费' },
  { name: '天气预报', tel: '12121', desc: '气象信息服务' },
];

export default function Hotlines({ onBack }: { onBack: () => void }) {
  return (
    <Page id="hotlines" title="常用电话" onBack={onBack}>
      <Card>
        {LINES.map((l) => (
          <TouchableOpacity
            key={l.tel}
            style={st.row}
            onPress={() => Linking.openURL(`tel:${l.tel}`)}>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{l.name}</Text>
              <Text style={st.desc}>{l.desc}</Text>
            </View>
            <Text style={st.tel}>{l.tel}</Text>
          </TouchableOpacity>
        ))}
      </Card>
      <Card>
        <Text style={st.tip}>点击即拨号。数据为全国统一公开服务号码，本地内置，无需联网。</Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line,
  },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  desc: { fontSize: 12, color: C.sub, marginTop: 2 },
  tel: { fontSize: 17, fontWeight: '700', color: C.primary },
  tip: { fontSize: 12, color: C.sub },
});

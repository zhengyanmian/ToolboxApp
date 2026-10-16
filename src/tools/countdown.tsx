import React, { useState } from 'react';
import { Page, Card, Field, Btn, Row, Result, C } from '../ui';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

type Item = { id: number; name: string; date: string };

function daysTo(dateStr: string): number | null {
  const m = dateStr.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const t = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  if (isNaN(t)) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((t - start) / 86400000);
}

export default function Countdown({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const nextId = items.reduce((mx, i) => Math.max(mx, i.id), 0) + 1;

  function add() {
    if (!name.trim() || daysTo(date) === null) {
      Alert.alert('提示', '请填写名称和合法的日期（YYYY-MM-DD）');
      return;
    }
    setItems([...items, { id: nextId, name: name.trim(), date }]);
    setName('');
    setDate('');
  }

  return (
    <Page id="countdown" title="纪念日 / 倒计时" onBack={onBack}>
      <Card>
        <Field label="事件名称" value={name} onChange={setName} placeholder="例如：考研、生日、发工资" />
        <Field label="目标日期" value={date} onChange={setDate} placeholder="2027-06-07" />
        <Row>
          <Btn text="添加" onPress={add} />
        </Row>
      </Card>
      {items.length === 0 ? (
        <Card>
          <Text style={st.tip}>还没有添加事件。添加后这里会显示「还有 N 天 / 已过 N 天」。列表仅保存在本次运行中。</Text>
        </Card>
      ) : (
        <Card>
          {items.map((it) => {
            const d = daysTo(it.date)!;
            const label = d > 0 ? `还有 ${d} 天` : d === 0 ? '就是今天' : `已过 ${-d} 天`;
            return (
              <View key={it.id} style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>{it.name}</Text>
                  <Text style={st.date}>{it.date}</Text>
                </View>
                <Text style={[st.days, { color: d >= 0 ? C.primary : C.sub }]}>{label}</Text>
                <TouchableOpacity onPress={() => setItems(items.filter((x) => x.id !== it.id))}>
                  <Text style={st.del}>删除</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 12,
  },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.sub, marginTop: 2 },
  days: { fontSize: 14, fontWeight: '700' },
  del: { fontSize: 13, color: C.warn },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

import React, { useEffect, useState } from 'react';
import { Page, Card, Field, Btn, Row, C, dynStyles} from '../ui';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Item = { id: number; name: string; y: number; m: number; d: number };

const KEY = 'countdown_items_v1';

function daysTo(y: number, m: number, d: number): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const t = new Date(y, m - 1, d).getTime();
  return Math.round((t - start) / 86400000);
}

export default function Countdown({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [yy, setYy] = useState('2027');
  const [mm, setMm] = useState('1');
  const [dd, setDd] = useState('1');

  // 读取持久化数据
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => {
        if (s) setItems(JSON.parse(s));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function save(next: Item[]) {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }

  function add() {
    const y = parseInt(yy, 10), m = parseInt(mm, 10), d = parseInt(dd, 10);
    if (!name.trim() || !y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert('提示', '请填写事件名称和正确的日期');
      return;
    }
    save([...items, { id: Date.now(), name: name.trim(), y, m, d }]);
    setName('');
  }

  function quick(days: number) {
    if (!name.trim()) {
      Alert.alert('提示', '请先填写事件名称');
      return;
    }
    const t = new Date();
    t.setDate(t.getDate() + days);
    save([...items, { id: Date.now(), name: name.trim(), y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }]);
  }

  function fillFromInput() {
    const y = parseInt(yy, 10), m = parseInt(mm, 10), d = parseInt(dd, 10);
    if (!name.trim() || !y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert('提示', '请填写事件名称和正确的日期');
      return;
    }
    save([...items, { id: Date.now(), name: name.trim(), y, m, d }]);
    setName('');
  }

  const upcoming = items
    .filter((it) => daysTo(it.y, it.m, it.d) >= 0)
    .sort((a, b) => daysTo(a.y, a.m, a.d) - daysTo(b.y, b.m, b.d));
  const past = items
    .filter((it) => daysTo(it.y, it.m, it.d) < 0)
    .sort((a, b) => daysTo(b.y, b.m, b.d) - daysTo(a.y, a.m, a.d));

  return (
    <Page id="countdown" title="纪念日 / 倒计时" onBack={onBack}>
      <Card>
        <Field label="事件名称" value={name} onChange={setName} placeholder="例如：考研、生日、发工资" />
        <Text style={st.label}>目标日期</Text>
        <View style={st.dateRow}>
          <View style={st.dateCol}>
            <Text style={st.dateLabel}>年</Text>
            <Field value={yy} onChange={setYy} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={st.dateCol}>
            <Text style={st.dateLabel}>月</Text>
            <Field value={mm} onChange={setMm} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={st.dateCol}>
            <Text style={st.dateLabel}>日</Text>
            <Field value={dd} onChange={setDd} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <View style={st.quick}>
          <TouchableOpacity style={st.qBtn} onPress={() => quick(1)}><Text style={st.qText}>明天</Text></TouchableOpacity>
          <TouchableOpacity style={st.qBtn} onPress={() => quick(7)}><Text style={st.qText}>一周后</Text></TouchableOpacity>
          <TouchableOpacity style={st.qBtn} onPress={() => quick(30)}><Text style={st.qText}>一个月后</Text></TouchableOpacity>
          <TouchableOpacity style={st.qBtn} onPress={() => quick(365)}><Text style={st.qText}>一年后</Text></TouchableOpacity>
        </View>
        <Row>
          <Btn text="添加" onPress={fillFromInput} />
        </Row>
      </Card>

      {!loaded ? null : items.length === 0 ? (
        <Card>
          <Text style={st.tip}>还没有添加事件。填好名称和日期后点"添加"，或用快捷日期按钮。数据自动保存在手机本地，重启不丢。</Text>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Card>
              <Text style={st.sec}>未来（{upcoming.length}）</Text>
              {upcoming.map((it) => {
                const d = daysTo(it.y, it.m, it.d);
                return (
                  <View key={it.id} style={st.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.name}>{it.name}</Text>
                      <Text style={st.date}>{it.y} 年 {it.m} 月 {it.d} 日</Text>
                    </View>
                    <Text style={[st.days, { color: d === 0 ? C.warn : C.primary }]}>
                      {d === 0 ? '就是今天' : `还有 ${d} 天`}
                    </Text>
                    <TouchableOpacity onPress={() => save(items.filter((x) => x.id !== it.id))}>
                      <Text style={st.del}>删</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Card>
          )}
          {past.length > 0 && (
            <Card>
              <Text style={st.sec}>已过去（{past.length}）</Text>
              {past.map((it) => {
                const d = daysTo(it.y, it.m, it.d);
                return (
                  <View key={it.id} style={st.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.name}>{it.name}</Text>
                      <Text style={st.date}>{it.y} 年 {it.m} 月 {it.d} 日</Text>
                    </View>
                    <Text style={[st.days, { color: C.sub }]}>已过 {-d} 天</Text>
                    <TouchableOpacity onPress={() => save(items.filter((x) => x.id !== it.id))}>
                      <Text style={st.del}>删</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Card>
          )}
        </>
      )}
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  label: { fontSize: 13, color: C.sub, marginBottom: 6 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 12, color: C.sub, marginBottom: 4 },
  quick: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  qBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.line,
  },
  qText: { fontSize: 13, color: C.primary },
  sec: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 12,
  },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.sub, marginTop: 2 },
  days: { fontSize: 14, fontWeight: '700' },
  del: { fontSize: 13, color: C.warn },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

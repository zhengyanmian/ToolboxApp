import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeepAwake from 'react-native-keep-awake';
import { Lunar } from 'lunar-typescript';
import { Page, C } from '../ui';

export default function ScreenClock({ onBack }: { onBack: () => void }) {
  const [now, setNow] = useState(new Date());
  const [showSec, setShowSec] = useState(true);
  const [invert, setInvert] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh24 = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const hour12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  const ampm = hh24 < 12 ? '上午' : '下午';
  const hh = String(showSec ? hh24 : hour12).padStart(2, '0');

  const lunarStr = useMemo(() => {
    try {
      const l = Lunar.fromDate(now);
      return `${l.getYearInGanZhi()}年 ${l.getMonthInChinese()}月${l.getDayInChinese()} · ${l.getJieQi() || ''}`;
    } catch {
      return '';
    }
  }, [now.getDate()]);

  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${week}`;

  const fg = invert ? C.bg : '#ffffff';
  const bg = invert ? '#0b0f14' : '#000000';
  const dim = invert ? '#5b6570' : '#7a828c';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <KeepAwake />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={1}
          onPress={() => setShowSec((v) => !v)}
          onLongPress={() => setInvert((v) => !v)}>
          <Text style={[st.time, { color: fg }]}>
            {showSec ? `${hh24}:${mm}` : `${ampm} ${hour12}:${mm}`}
            {showSec && <Text style={[st.sec, { color: dim }]}>:{ss}</Text>}
          </Text>
          <Text style={[st.date, { color: fg }]}>{dateStr}</Text>
          {lunarStr ? <Text style={[st.lunar, { color: dim }]}>{lunarStr}</Text> : null}
          <Text style={[st.hint, { color: dim }]}>
            点按切换 12/24 小时制 · 长按反转配色
          </Text>
        </TouchableOpacity>
        <View style={st.footer}>
          <Text style={[st.back, { color: dim }]} onPress={onBack}>
            ‹ 返回工具箱
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  time: { fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sec: { fontSize: 36, fontWeight: '600' },
  date: { fontSize: 16, marginTop: 16, fontWeight: '500' },
  lunar: { fontSize: 14, marginTop: 8 },
  hint: { fontSize: 11, marginTop: 36 },
  footer: { alignItems: 'center', paddingBottom: 8 },
  back: { fontSize: 14, padding: 8 },
});

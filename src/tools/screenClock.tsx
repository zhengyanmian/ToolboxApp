import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lunar } from 'lunar-typescript';
import { C } from '../ui';
import { setKeepScreenOn, setOrientation } from '../native';

const COLORS = [
  { name: '白', main: '#ffffff', accent: '#9ca3af' },
  { name: '青', main: '#22d3ee', accent: '#155e75' },
  { name: '琥珀', main: '#fbbf24', accent: '#78350f' },
  { name: '绿', main: '#4ade80', accent: '#14532d' },
  { name: '粉', main: '#f472b6', accent: '#831843' },
];
const SIZES = [
  { name: '小', time: 56, date: 15 },
  { name: '中', time: 84, date: 17 },
  { name: '大', time: 116, date: 19 },
];

export default function ScreenClock({ onBack }: { onBack: () => void }) {
  const [now, setNow] = useState(new Date());
  const [showBar, setShowBar] = useState(true);
  const [hour12, setHour12] = useState(false);
  const [showSec, setShowSec] = useState(true);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [colorIdx, setColorIdx] = useState(1);
  const [landscape, setLandscape] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 默认横屏；离开时恢复跟随系统
  useEffect(() => {
    setOrientation('landscape');
    setKeepScreenOn(true);
    return () => {
      setOrientation('auto');
      setKeepScreenOn(false);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 选项栏自动隐藏
  const poke = () => {
    setShowBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowBar(false), 4000);
  };

  const hh24 = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const h12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  const ampm = hh24 < 12 ? 'AM' : 'PM';
  const size = SIZES[sizeIdx];
  const color = COLORS[colorIdx];

  const lunarStr = useMemo(() => {
    try {
      const l = Lunar.fromDate(now);
      return `${l.getYearInGanZhi()}年 ${l.getMonthInChinese()}月${l.getDayInChinese()}${
        l.getJieQi() ? ' · ' + l.getJieQi() : ''
      }`;
    } catch {
      return '';
    }
  }, [now.getDate()]);

  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')} 星期${week}`;

  const bg = '#000000';
  const dim = '#5b6570';

  return (
    <View style={{ flex: 1, backgroundColor: bg }} onTouchStart={poke}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* 顶部选项栏 */}
        {showBar && (
          <View style={st.bar}>
            <OptBtn text="返回" onPress={onBack} />
            <OptBtn
              text={landscape ? '↻ 竖屏' : '↻ 横屏'}
              onPress={() => {
                const next = !landscape;
                setLandscape(next);
                setOrientation(next ? 'landscape' : 'portrait');
              }}
            />
            <OptBtn
              text={hour12 ? '12 小时' : '24 小时'}
              onPress={() => setHour12((v) => !v)}
            />
            <OptBtn text={showSec ? '隐藏秒' : '显示秒'} onPress={() => setShowSec((v) => !v)} />
            <OptBtn
              text={`字号 ${size.name}`}
              onPress={() => setSizeIdx((i) => (i + 1) % SIZES.length)}
            />
            <OptBtn
              text={`颜色 ${color.name}`}
              onPress={() => setColorIdx((i) => (i + 1) % COLORS.length)}
            />
          </View>
        )}

        {/* 时钟主体 */}
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={1}
          onPress={poke}>
          <Text style={[st.time, { color: color.main, fontSize: size.time }]}>
            {hour12 ? `${h12}:${mm}` : `${String(hh24).padStart(2, '0')}:${mm}`}
            {showSec && <Text style={[st.sec, { color: color.accent, fontSize: size.time * 0.45 }]}>:{ss}</Text>}
            {hour12 && <Text style={[st.ampm, { color: color.accent, fontSize: size.date }]}> {ampm}</Text>}
          </Text>
          <Text style={[st.date, { color: color.main, fontSize: size.date }]}>{dateStr}</Text>
          {lunarStr ? (
            <Text style={[st.lunar, { color: dim, fontSize: size.date - 3 }]}>{lunarStr}</Text>
          ) : null}
          {!showBar && (
            <Text style={[st.hint, { color: dim }]}>点按屏幕呼出选项</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function OptBtn(props: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={st.optBtn} onPress={props.onPress} activeOpacity={0.7}>
      <Text style={st.optText}>{props.text}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#111827dd',
    borderRadius: 12,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optBtn: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optText: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  time: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  sec: { fontWeight: '600' },
  ampm: { fontWeight: '600' },
  date: { marginTop: 14, fontWeight: '500', fontVariant: ['tabular-nums'] },
  lunar: { marginTop: 8 },
  hint: { fontSize: 11, marginTop: 30 },
});

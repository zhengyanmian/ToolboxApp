import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Lunar } from 'lunar-typescript';
import { Btn } from '../ui';
import { setKeepScreenOn, setOrientation, setImmersive } from '../native';

const COLORS = ['#ffffff', '#67e8f9', '#fcd34d', '#86efac', '#f9a8d4', '#f87171'];
const SEC_SCALE: Record<string, number> = { small: 0.35, mid: 0.6, big: 1 };

export default function ScreenClock({ onBack }: { onBack: () => void }) {
  const [now, setNow] = useState(new Date());
  const [is24, setIs24] = useState(true);
  const [showSec, setShowSec] = useState(true);
  const [secSize, setSecSize] = useState<'small' | 'mid' | 'big'>('small');
  const [fontSize, setFontSize] = useState(110);
  const [portrait, setPortrait] = useState(false);
  const [colorIdx, setColorIdx] = useState(0);
  const [bar, setBar] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOrientation('landscape');
    setImmersive(true);
    setKeepScreenOn(true);
    const t = setInterval(() => setNow(new Date()), 250);
    return () => {
      clearInterval(t);
      setImmersive(false);
      setOrientation('auto');
      setKeepScreenOn(false);
    };
  }, []);

  const poke = () => {
    setBar(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBar(false), 4000);
  };

  const hh = now.getHours();
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const main =
    String(is24 ? hh : h12).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  const lunar = Lunar.fromDate(now);
  const dateLine = `${now.getMonth() + 1}月${now.getDate()}日 ${
    ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  } · 农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  const color = COLORS[colorIdx];

  const timeBlock = portrait ? (
    <View style={{ alignItems: 'center' }}>
      {main.split('').map((ch, i) => (
        <Text
          key={i}
          style={[
            st.digit,
            {
              color,
              fontSize: Math.min(fontSize, 90),
              lineHeight: Math.min(fontSize, 90) * 1.06,
            },
          ]}>
          {ch}
        </Text>
      ))}
      {showSec && (
        <Text
          style={[
            st.digit,
            { color, fontSize: Math.min(fontSize, 90) * SEC_SCALE[secSize], marginTop: 6 },
          ]}>
          {sec}
        </Text>
      )}
    </View>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={[st.time, { color, fontSize, lineHeight: fontSize * 1.1 }]}>{main}</Text>
      {showSec && (
        <Text
          style={[
            st.sec,
            {
              color,
              fontSize: fontSize * SEC_SCALE[secSize],
              lineHeight: fontSize * SEC_SCALE[secSize] * 1.1,
              marginBottom: fontSize * 0.12,
            },
          ]}>
          {sec}
        </Text>
      )}
    </View>
  );

  return (
    <View style={st.root} onTouchStart={poke}>
      <StatusBar hidden />
      {timeBlock}
      <Text style={[st.date, { color, opacity: 0.55 }]}>{dateLine}</Text>
      {bar && (
        <View style={st.bar}>
          <View style={st.barRow}>
            <Btn text="返回" onPress={onBack} />
            <Btn
              text={portrait ? '横屏' : '竖屏'}
              onPress={() => {
                const p = !portrait;
                setPortrait(p);
                setOrientation(p ? 'portrait' : 'landscape');
              }}
            />
            <Btn text={is24 ? '24时' : '12时'} onPress={() => setIs24(!is24)} />
            <Btn text={showSec ? '有秒' : '无秒'} onPress={() => setShowSec(!showSec)} />
            <Btn
              text={`秒${secSize === 'small' ? '小' : secSize === 'mid' ? '中' : '大'}`}
              onPress={() =>
                setSecSize(secSize === 'small' ? 'mid' : secSize === 'mid' ? 'big' : 'small')
              }
            />
            <Btn text="颜色" onPress={() => setColorIdx((colorIdx + 1) % COLORS.length)} />
          </View>
          <View style={st.barRow}>
            <Btn text="字号−10" onPress={() => setFontSize(Math.max(40, fontSize - 10))} />
            <Btn text="−" onPress={() => setFontSize(Math.max(40, fontSize - 1))} />
            <Text style={st.fsLabel}>{Math.round(fontSize)}</Text>
            <Btn text="＋" onPress={() => setFontSize(Math.min(240, fontSize + 1))} />
            <Btn text="字号＋10" onPress={() => setFontSize(Math.min(240, fontSize + 10))} />
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontWeight: '300', fontVariant: ['tabular-nums'] },
  digit: { textAlign: 'center', fontWeight: '300', fontVariant: ['tabular-nums'] },
  sec: { fontWeight: '300', fontVariant: ['tabular-nums'], marginLeft: 8 },
  date: { fontSize: 15, marginTop: 14 },
  bar: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  fsLabel: {
    color: '#e5e7eb',
    fontSize: 13,
    minWidth: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

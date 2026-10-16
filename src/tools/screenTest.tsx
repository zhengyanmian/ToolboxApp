import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../ui';
import { setImmersive, setKeepScreenOn } from '../native';

const SCREEN_COLORS: { name: string; hex: string; dark?: boolean }[] = [
  { name: '纯白', hex: '#ffffff', dark: true },
  { name: '纯黑', hex: '#000000' },
  { name: '红', hex: '#ff0000' },
  { name: '绿', hex: '#00ff00', dark: true },
  { name: '蓝', hex: '#0000ff' },
  { name: '青', hex: '#00ffff', dark: true },
  { name: '洋红', hex: '#ff00ff' },
  { name: '黄', hex: '#ffff00', dark: true },
  { name: '灰 50%', hex: '#808080' },
  { name: '灰 25%', hex: '#404040' },
];

/**
 * 纯色坏点 / 漏光检测：全屏循环纯色，点击屏幕右侧切换下一色，左侧返回上一色。
 * 长按屏幕退出。用于检查屏幕亮点、暗点、偏色与漏光。
 */
export default function ScreenTest({ onBack }: { onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [hint, setHint] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImmersive(true);
    setKeepScreenOn(true);
    return () => {
      setImmersive(false);
      setKeepScreenOn(false);
    };
  }, []);

  useEffect(() => {
    setHint(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(false), 2200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [idx]);

  const c = SCREEN_COLORS[idx];
  const fg = c.dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.72)';

  return (
    <View style={[st.root, { backgroundColor: c.hex }]}>
      <StatusBar hidden />
      <View style={st.row}>
        <Pressable
          style={st.zone}
          onPress={() => setIdx((i) => (i - 1 + SCREEN_COLORS.length) % SCREEN_COLORS.length)}
        />
        <Pressable
          style={st.zone}
          onPress={() => setIdx((i) => (i + 1) % SCREEN_COLORS.length)}
          onLongPress={onBack}
          delayLongPress={700}
        />
      </View>

      {hint ? (
        <View style={[st.hint, { borderColor: fg }]}>
          <Text style={[st.hintText, { color: fg }]}>
            {c.name} {c.hex}
          </Text>
          <Text style={[st.hintSub, { color: fg }]}>点右半屏下一色 · 点左半屏上一色 · 长按退出</Text>
        </View>
      ) : null}

      <View style={st.dots}>
        {SCREEN_COLORS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === idx ? 18 : 6,
              height: 6,
              borderRadius: 3,
              marginRight: 5,
              backgroundColor: fg,
            }}
          />
        ))}
      </View>

      <View style={st.backBtn}>
        <Icon name="close" size={18} color={fg} />
        <Text
          style={{ color: fg, fontSize: 12, marginLeft: 4 }}
          onPress={onBack}>
          退出
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  zone: { flex: 1 },
  hint: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  hintText: { fontSize: 16, fontWeight: '700' },
  hintSub: { fontSize: 11.5, marginTop: 5 },
  dots: { position: 'absolute', bottom: 34, flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    top: 30,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

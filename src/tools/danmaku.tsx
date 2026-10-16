import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Easing, StatusBar } from 'react-native';
import { C } from '../ui';
import { setImmersive } from '../native';

const COLORS = ['#ffffff', '#f87171', '#4ade80', '#60a5fa', '#fbbf24', '#f472b6'];
const BG = ['#000000', '#dc2626', '#16a34a', '#1d4ed8', '#7c3aed'];

export default function Danmaku({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState('大哥大嫂过年好');
  const [colorIdx, setColorIdx] = useState(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [editing, setEditing] = useState(true);
  const x = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    setImmersive(true);
    return () => setImmersive(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    x.setValue(1);
    const dur = 14000 / speed;
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -3.2, duration: dur, easing: Easing.linear, useNativeDriver: true }),
    );
    loopRef.current = anim;
    anim.start();
    return () => anim.stop();
  }, [playing, speed, text]);

  const translateX = x.interpolate({
    inputRange: [-3.2, 1],
    outputRange: ['-320%', '100%'],
  });

  return (
    <View style={[st.root, { backgroundColor: BG[bgIdx] }]} onTouchEnd={() => setEditing(!editing)}>
      <StatusBar barStyle="light-content" />
      {!editing && (
        <Animated.Text
          style={[
            st.text,
            { color: COLORS[colorIdx], transform: [{ translateX }] },
          ]}
          numberOfLines={1}>
          {text || '请输入弹幕内容'}
        </Animated.Text>
      )}
      {editing && (
        <View style={st.panel}>
          <Text style={st.title}>手持弹幕</Text>
          <TextInput
            style={st.input}
            value={text}
            onChangeText={setText}
            placeholder="输入要展示的文字"
            placeholderTextColor="#6b7280"
            multiline
          />
          <View style={st.row}>
            <Text style={st.lab}>文字</Text>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[st.swatch, { backgroundColor: c }, colorIdx === i && st.swOn]}
                onPress={() => setColorIdx(i)}
              />
            ))}
          </View>
          <View style={st.row}>
            <Text style={st.lab}>背景</Text>
            {BG.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[st.swatch, { backgroundColor: c }, bgIdx === i && st.swOn]}
                onPress={() => setBgIdx(i)}
              />
            ))}
          </View>
          <View style={st.row}>
            <Text style={st.lab}>速度</Text>
            {[
              { l: '慢', v: 0.6 },
              { l: '中', v: 1 },
              { l: '快', v: 1.8 },
            ].map((s) => (
              <Text
                key={s.l}
                style={[st.opt, speed === s.v && st.optOn]}
                onPress={() => setSpeed(s.v)}>
                {s.l}
              </Text>
            ))}
          </View>
          <View style={st.row}>
            <TouchableOpacity style={st.btn} onPress={() => setEditing(false)}>
              <Text style={st.btnT}>开始滚动（点屏幕可再编辑）</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { backgroundColor: '#374151' }]} onPress={onBack}>
              <Text style={st.btnT}>返回</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  text: {
    fontSize: 88,
    fontWeight: '900',
    width: '100%',
    textAlign: 'left',
  },
  panel: {
    backgroundColor: 'rgba(17,24,39,0.94)',
    margin: 20,
    borderRadius: 16,
    padding: 18,
  },
  title: { color: '#f9fafb', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  lab: { color: '#9ca3af', fontSize: 13, width: 34 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swOn: { borderColor: '#ffffff' },
  opt: { color: '#9ca3af', fontSize: 14, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1f2937', borderRadius: 8 },
  optOn: { color: '#fbbf24', fontWeight: '700' },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  btnT: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

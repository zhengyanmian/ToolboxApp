import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Field, Icon, Segmented, Slider, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { setImmersive, setKeepScreenOn, setOrientation } from '../native';

/** 呈现方式 */
type Mode = 'scroll' | 'blink' | 'static';
/** 滚动方向 */
type Dir = 'left' | 'right';

const TEXT_COLORS = ['#ffffff', '#ff5b5b', '#ffd166', '#4ade80', '#4cc9f0', '#a78bfa', '#ff8ad8'];
const BG_COLORS = ['#000000', '#0b0f16', '#7f1d1d', '#1e3a8a', '#14532d', '#4c1d95', '#ffffff'];

const SPEEDS: { label: string; value: number }[] = [
  { label: '慢', value: 0.5 },
  { label: '中', value: 1 },
  { label: '快', value: 1.8 },
  { label: '极快', value: 3 },
];
const MODES: { label: string; value: Mode }[] = [
  { label: '滚动', value: 'scroll' },
  { label: '静止闪烁', value: 'blink' },
  { label: '静止常亮', value: 'static' },
];
const DIRS: { label: string; value: Dir }[] = [
  { label: '左移', value: 'left' },
  { label: '右移', value: 'right' },
];
const ROTS: { label: string; value: 0 | 90 }[] = [
  { label: '0°', value: 0 },
  { label: '90°', value: 90 },
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

/** 归一化 HEX（补 #） */
function normHex(v: string): string {
  const s = v.trim();
  return s.startsWith('#') ? s : '#' + s;
}

/** 颜色亮度，决定勾选图标用黑还是白 */
function lum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export default function Danmaku({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [text, setText] = useState('大哥大嫂过年好');
  const [size, setSize] = useState(96);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<Mode>('scroll');
  const [dir, setDir] = useState<Dir>('left');
  const [rot, setRot] = useState<0 | 90>(0);
  const [color, setColor] = useState(TEXT_COLORS[0]);
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [hexIn, setHexIn] = useState('');
  const [bgHexIn, setBgHexIn] = useState('');
  const [playing, setPlaying] = useState(true);
  const [panel, setPanel] = useState(true);
  const [textW, setTextW] = useState(0);

  const x = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  const prevPlaying = useRef(true);

  // 沉浸式 + 常亮
  useEffect(() => {
    setImmersive(true);
    setKeepScreenOn(true);
    return () => {
      setImmersive(false);
      setKeepScreenOn(false);
      setOrientation('auto');
    };
  }, []);

  // 90° 手持时切横屏
  useEffect(() => {
    setOrientation(rot === 90 ? 'landscape' : 'auto');
  }, [rot]);

  const extent = rot === 90 ? height : width;

  // 滚动动画：位移用像素区间，保证文字从一端完整滑到另一端
  useEffect(() => {
    if (mode !== 'scroll' || !playing || textW <= 0) return;
    x.setValue(0);
    const distance = extent + textW;
    const pxPerSec = 240 * speed;
    const duration = Math.max(1500, (distance / pxPerSec) * 1000);
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [mode, playing, speed, textW, extent, dir, rot, x]);

  // 闪烁动画
  useEffect(() => {
    if (mode !== 'blink' || !playing) {
      blink.setValue(1);
      return;
    }
    blink.setValue(1);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.12, duration: 520, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [mode, playing, blink]);

  // 屏幕内轻点：播放/暂停；双击：打开设置面板
  const onBackdrop = () => {
    if (panel) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setPlaying(prevPlaying.current);
      setPanel(true);
      return;
    }
    lastTap.current = now;
    prevPlaying.current = playing;
    setPlaying(!playing);
  };

  const applyHex = (v: string, target: 'text' | 'bg') => {
    if (target === 'text') {
      setHexIn(v);
      if (HEX.test(v.trim())) setColor(normHex(v));
    } else {
      setBgHexIn(v);
      if (HEX.test(v.trim())) setBg(normHex(v));
    }
  };

  const showText = text.length ? text : '请输入弹幕内容';
  const translate = x.interpolate({
    inputRange: [0, 1],
    outputRange: dir === 'left' ? [extent, -textW] : [-textW, extent],
  });

  const rotStyle = rot === 90 ? { transform: [{ rotate: '90deg' as const }] } : null;
  // 静止类模式水平居中，滚动模式靠左锚定以保证像素位移精确
  const centerAlign = rot === 90 || mode !== 'scroll';

  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <StatusBar hidden />

      <View style={[st.layer, centerAlign ? { alignItems: 'center' } : null]} pointerEvents="none">
        {mode === 'scroll' ? (
          <Animated.View
            style={[st.mover, { transform: rot === 90 ? [{ translateY: translate }] : [{ translateX: translate }] }]}>
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
              style={[st.big, { color, fontSize: size }, rotStyle]}>
              {showText}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: mode === 'blink' ? blink : 1 }}>
            <Text numberOfLines={1} allowFontScaling={false} style={[st.big, { color, fontSize: size }, rotStyle]}>
              {showText}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* 轻点/双击的接收层（位于文字之上、控件之下） */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} />

      <View style={[st.top, { top: insets.top + 8 }]}>
        <GlassBtn icon="chevron" onPress={onBack} />
        <View style={{ flex: 1 }} />
        <GlassBtn icon="sliders" onPress={() => setPanel(true)} />
      </View>

      {!panel ? (
        <View style={[st.hintWrap, { bottom: insets.bottom + 18 }]} pointerEvents="none">
          <View style={st.hintPill}>
            <Text style={st.hintText}>
              {playing ? '轻点屏幕暂停' : '轻点屏幕继续'} · 双击打开设置
            </Text>
          </View>
        </View>
      ) : null}

      {panel ? (
        <View style={st.sheetWrap}>
          <Tap style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]} onPress={() => setPanel(false)}>
            <View />
          </Tap>
          <Card style={[st.sheet, { marginBottom: insets.bottom + 10 }]} pad={16}>
            <View style={st.sheetHead}>
              <Text style={st.sheetTitle}>弹幕设置</Text>
              <Tap onPress={() => setPanel(false)} style={st.sheetClose} hitSlop={10}>
                <Icon name="close" size={18} color={p.sub} />
              </Tap>
            </View>
            <ScrollView
              style={{ maxHeight: height * 0.62 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Field label="弹幕文字" value={text} onChange={setText} multiline placeholder="输入要展示的文字" />

              <Slider
                label="字号"
                value={size}
                onChange={setSize}
                min={40}
                max={200}
                step={1}
                format={(v) => String(Math.round(v))}
              />

              <Text style={st.lab}>速度</Text>
              <Segmented options={SPEEDS} value={speed} onChange={setSpeed} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>呈现方式</Text>
              <Segmented options={MODES} value={mode} onChange={setMode} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>滚动方向</Text>
              <Segmented options={DIRS} value={dir} onChange={setDir} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>旋转</Text>
              <Segmented options={ROTS} value={rot} onChange={setRot} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>文字颜色</Text>
              <Swatches colors={TEXT_COLORS} value={color} onChange={setColor} />
              <Field value={hexIn} onChange={(v) => applyHex(v, 'text')} placeholder="自定义文字色 #RRGGBB" />

              <Text style={st.lab}>背景颜色</Text>
              <Swatches colors={BG_COLORS} value={bg} onChange={setBg} />
              <Field value={bgHexIn} onChange={(v) => applyHex(v, 'bg')} placeholder="自定义背景色 #RRGGBB" />
            </ScrollView>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/** 固定深色玻璃圆钮：在任何用户背景色上都清晰可见 */
function GlassBtn(props: { icon: 'chevron' | 'sliders'; onPress: () => void }) {
  return (
    <Tap onPress={props.onPress} style={st.glassBtn} hitSlop={8}>
      <Icon name={props.icon} size={20} color="#ffffff" />
    </Tap>
  );
}

/** 预设色点 */
function Swatches(props: { colors: string[]; value: string; onChange: (c: string) => void }) {
  const p = usePalette();
  return (
    <View style={st.swatchRow}>
      {props.colors.map((c) => {
        const on = c.toLowerCase() === props.value.toLowerCase();
        return (
          <Tap
            key={c}
            onPress={() => props.onChange(c)}
            style={[st.swatch, { backgroundColor: c, borderColor: on ? p.primary : p.line }]}>
            {on ? <Icon name="check" size={15} color={lum(c) > 0.62 ? '#111827' : '#ffffff'} strokeWidth={2.4} /> : <View />}
          </Tap>
        );
      })}
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1, overflow: 'hidden' },
    layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'flex-start' },
    mover: { alignItems: 'flex-start' },
    big: { fontWeight: '900', includeFontPadding: false },
    top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center' },
    glassBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(20,24,32,0.42)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    hintPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(20,24,32,0.45)',
    },
    hintText: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
    sheetWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'flex-end',
      paddingHorizontal: 14,
    },
    sheet: { marginBottom: 12, backgroundColor: C.cardSolid, borderColor: C.cardBorder },
    sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
    sheetClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.chip,
    },
    lab: { fontSize: 12.5, fontWeight: '600', color: C.sub, marginBottom: 6 },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
  }),
);

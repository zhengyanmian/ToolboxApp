import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, dynStyles, usePalette, useTheme } from './theme';
import { DETAILS } from './details';
import { Icon, IconName } from './icons';
import { copyText } from './native';

export { C, dynStyles };
export { Icon };
export type { IconName };

const A_Press = Animated.createAnimatedComponent(Pressable);

/* ------------------------------------------------------------------ */
/* 背景层：柔和渐变 + 双色光晕（模拟景深，营造玻璃基底）               */
/* ------------------------------------------------------------------ */
export function Background() {
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={p.bgTop} />
            <Stop offset="1" stopColor={p.bgBottom} />
          </LinearGradient>
          <RadialGradient id="g1" cx="0.1" cy="0.02" r="0.75">
            <Stop offset="0" stopColor={p.bgGlow} stopOpacity={p.isDark ? 0.55 : 0.75} />
            <Stop offset="1" stopColor={p.bgGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="g2" cx="0.95" cy="0.22" r="0.7">
            <Stop offset="0" stopColor={p.glowB} stopOpacity={p.isDark ? 0.3 : 0.34} />
            <Stop offset="1" stopColor={p.glowB} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#g1)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#g2)" />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 流光轮廓：渐变描边 + 循环扫光                                       */
/* ------------------------------------------------------------------ */
export function Glow(props: {
  children: React.ReactNode;
  radius?: number;
  style?: object;
  animate?: boolean;
  colors?: [string, string];
}) {
  const p = usePalette();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const animate = props.animate !== false;

  useEffect(() => {
    if (!animate || w === 0) return;
    x.setValue(0);
    const a = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    a.start();
    return () => a.stop();
  }, [animate, w, x]);

  const r = props.radius ?? 22;
  const [ca, cb] = props.colors ?? [p.glowA, p.glowB];
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.8, w * 1.2] });

  return (
    <View
      style={[{ borderRadius: r + 1.5, padding: 1.5, overflow: 'hidden' }, props.style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={ca} stopOpacity={0.9} />
              <Stop offset="0.5" stopColor={cb} stopOpacity={0.55} />
              <Stop offset="1" stopColor={ca} stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#gl)" />
        </Svg>
        {animate && (
          <Animated.View
            style={{
              position: 'absolute',
              top: -60,
              bottom: -60,
              width: Math.max(40, w * 0.35),
              backgroundColor: '#ffffff',
              opacity: p.isDark ? 0.16 : 0.42,
              transform: [{ translateX: tx }, { rotate: '16deg' }],
            }}
          />
        )}
      </View>
      <View style={{ borderRadius: r, overflow: 'hidden', backgroundColor: p.cardSolid }}>
        {props.children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 玻璃质感层：ColorOS 式「上亮下暗」高光 + 可选渐变底                  */
/* ------------------------------------------------------------------ */
let glassSeed = 0;

export function GlassLayer(props: {
  radius: number;
  tone?: 'card' | 'button' | 'primary';
  from?: string;
  to?: string;
}) {
  const p = usePalette();
  const id = useMemo(() => `gl${(glassSeed += 1)}`, []);
  const tone = props.tone ?? 'card';

  if (tone === 'primary') {
    const from = props.from ?? p.primary2;
    const to = props.to ?? p.primary;
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: props.radius, overflow: 'hidden' }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
        {/* 顶部高光，做出立体玻璃感 */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '48%',
            backgroundColor: 'rgba(255,255,255,0.18)',
          }}
        />
      </View>
    );
  }

  const top =
    tone === 'button'
      ? p.isDark
        ? 0.075
        : 0.5
      : p.isDark
      ? 0.055
      : 0.36;
  const bottom = p.isDark ? 0.015 : 0.08;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: props.radius, overflow: 'hidden' }]}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '46%',
          backgroundColor: `rgba(255,255,255,${top})`,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '30%',
          backgroundColor: p.isDark ? `rgba(0,0,0,0.14)` : `rgba(255,255,255,${bottom})`,
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 通用按压组件：弹性缩放反馈                                          */
/* ------------------------------------------------------------------ */
export function Tap(props: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (n: number) =>
    Animated.spring(v, { toValue: n, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <A_Press
      disabled={props.disabled}
      hitSlop={props.hitSlop}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressIn={() => to(props.scaleTo ?? 0.97)}
      onPressOut={() => to(1)}
      style={[props.style, { transform: [{ scale: v }] }, props.disabled ? { opacity: 0.45 } : null]}>
      {props.children}
    </A_Press>
  );
}

/* ------------------------------------------------------------------ */
/* 页面容器：玻璃头部 + 边缘滑动返回 + 进场动效                        */
/* ------------------------------------------------------------------ */
export function Page(props: {
  id?: string;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: object;
  right?: React.ReactNode;
  plain?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const detail = props.id ? DETAILS[props.id] : undefined;

  // 进场动效：整页轻微上移淡入（只做一次，native 驱动）
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const body = (
    <>
      {detail ? (
        <View
          style={{
            backgroundColor: p.primarySoft,
            borderRadius: 16,
            padding: 13,
            marginBottom: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.primary + '44',
          }}>
          <Text style={{ fontSize: 12.5, color: p.isDark ? p.sub : '#334155', lineHeight: 20 }}>
            {detail}
          </Text>
        </View>
      ) : null}
      {props.children}
      <View style={{ height: 28 }} />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Background />
      <Animated.View
        style={{
          flex: 1,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        }}>
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 10,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: p.header,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: p.line,
          }}>
          {props.onBack ? (
            <Tap onPress={props.onBack} style={s.back} hitSlop={10}>
              <Icon name="chevron" size={21} color={p.text} strokeWidth={2.1} />
            </Tap>
          ) : (
            <View style={s.back} />
          )}
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: p.text }}>
            {props.title}
          </Text>
          <View style={s.back}>{props.right}</View>
        </View>
        {props.scroll === false ? (
          <View style={[{ flex: 1, padding: 14 }, props.contentStyle]}>{body}</View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[{ padding: 14 }, props.contentStyle]}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 基础组件                                                           */
/* ------------------------------------------------------------------ */
export function Card(props: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  pad?: number;
}) {
  const p = usePalette();
  const radius = 24;
  const style = [
    {
      backgroundColor: p.card,
      borderRadius: radius,
      padding: props.pad ?? 15,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.cardBorder,
      shadowColor: p.cardShadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    props.style,
  ];
  const inner = (
    <>
      <GlassLayer radius={radius} tone="card" />
      {props.children}
    </>
  );
  if (props.onPress) {
    return (
      <Tap onPress={props.onPress} style={style}>
        {inner}
      </Tap>
    );
  }
  return <View style={style}>{inner}</View>;
}

export function SectionTitle(props: { text: string; right?: React.ReactNode; style?: any }) {
  const p = usePalette();
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', marginBottom: 9, marginTop: 4 },
        props.style,
      ]}>
      <View
        style={{
          width: 3,
          height: 13,
          borderRadius: 2,
          backgroundColor: p.primary,
          marginRight: 8,
        }}
      />
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: p.text, flex: 1, letterSpacing: 0.3 }}>
        {props.text}
      </Text>
      {props.right}
    </View>
  );
}

export function Divider(props: { style?: any }) {
  const p = usePalette();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: p.line, marginVertical: 10 }, props.style]}
    />
  );
}

export function Btn(props: {
  text: string;
  onPress: () => void;
  kind?: 'primary' | 'plain' | 'ghost' | 'soft' | 'danger';
  style?: any;
  icon?: IconName;
  size?: 'sm' | 'md';
  fit?: boolean;
  disabled?: boolean;
}) {
  const p = usePalette();
  const kind = props.kind ?? 'primary';
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: p.primary, fg: p.onPrimary, border: 'transparent' },
    plain: { bg: p.card, fg: p.primary, border: p.primary + '55' },
    soft: { bg: p.primarySoft, fg: p.primary, border: 'transparent' },
    ghost: { bg: 'transparent', fg: p.text, border: p.line },
    danger: { bg: p.warn + '1f', fg: p.warn, border: 'transparent' },
  };
  const k = palette[kind];
  const sm = props.size === 'sm';
  const radius = kind === 'ghost' ? 18 : 999;
  return (
    <Tap
      onPress={props.onPress}
      disabled={props.disabled}
      style={[
        {
          flexGrow: props.fit ? 0 : 1,
          flexShrink: 0,
          flexBasis: props.fit ? undefined : 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: radius,
          paddingVertical: sm ? 8 : 13,
          paddingHorizontal: sm ? 13 : 17,
          overflow: 'hidden',
          backgroundColor: kind === 'primary' ? 'transparent' : k.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: k.border,
        },
        props.style,
      ]}>
      <GlassLayer radius={radius} tone={kind === 'primary' ? 'primary' : 'button'} />
      {props.icon ? <Icon name={props.icon} size={sm ? 15 : 17} color={k.fg} /> : null}
      <Text style={{ color: k.fg, fontSize: sm ? 13.5 : 15, fontWeight: '600' }} numberOfLines={1}>
        {props.text}
      </Text>
    </Tap>
  );
}

export function Chip(props: {
  text: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: any;
}) {
  const p = usePalette();
  return (
    <Tap
      onPress={props.onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 13,
          paddingVertical: 7,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: props.active ? p.primary : p.chip,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: props.active ? p.primary : p.chipBorder,
        },
        props.style,
      ]}>
      <GlassLayer radius={999} tone={props.active ? 'primary' : 'button'} />
      {props.icon ? (
        <Icon name={props.icon} size={14} color={props.active ? p.onPrimary : p.sub} />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: props.active ? '700' : '500',
          color: props.active ? p.onPrimary : p.sub,
        }}>
        {props.text}
      </Text>
    </Tap>
  );
}

export function Segmented<T extends string | number>(props: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  style?: any;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: p.chip,
          borderRadius: 14,
          padding: 3,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.chipBorder,
        },
        props.style,
      ]}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Tap
            key={String(o.value)}
            onPress={() => props.onChange(o.value)}
            style={[
              {
                flex: 1,
                paddingVertical: 8,
                borderRadius: 11,
                alignItems: 'center',
                backgroundColor: on ? p.primary : 'transparent',
              },
            ]}>
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: on ? '700' : '500',
                color: on ? p.onPrimary : p.sub,
              }}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

export function Field(props: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'numbers-and-punctuation';
  style?: any;
}) {
  const p = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ marginBottom: 12 }, props.style]}>
      {props.label ? (
        <Text style={{ fontSize: 12.5, color: p.sub, marginBottom: 6, fontWeight: '600' }}>
          {props.label}
        </Text>
      ) : null}
      <TextInput
        style={{
          backgroundColor: p.input,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: focus ? p.primary : p.line,
          paddingHorizontal: 13,
          paddingVertical: Platform.OS === 'android' ? 9 : 11,
          fontSize: 15,
          color: p.text,
          minHeight: props.multiline ? 96 : undefined,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }}
        value={props.value}
        onChangeText={props.onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={props.placeholder}
        placeholderTextColor={p.faint}
        multiline={props.multiline}
        keyboardType={props.keyboardType}
      />
    </View>
  );
}

export function Toggle(props: { value: boolean; onChange: (v: boolean) => void; style?: any }) {
  const p = usePalette();
  const v = useRef(new Animated.Value(props.value ? 1 : 0)).current;
  useEffect(() => {
    // 开关颜色/位移用 JS 驱动；外层 Tap 的按压缩放是 native 驱动。
    // 二者必须落在不同节点上，否则会抛 "JS driven animation on node moved to native" 崩溃。
    Animated.spring(v, {
      toValue: props.value ? 1 : 0,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [props.value, v]);
  const W = 58;
  const H = 34;
  const K = 28;
  return (
    <Tap
      onPress={() => props.onChange(!props.value)}
      style={[
        {
          width: W,
          height: H,
          borderRadius: 999,
          padding: 3,
          overflow: 'hidden',
          backgroundColor: p.track,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.08)',
          justifyContent: 'center',
        },
        props.style,
      ]}>
      {/* 开启时的主题色填充（独立节点，JS 驱动透明度） */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: p.primary, opacity: v }]}
      />
      {/* 顶部高光，营造玻璃质感 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '50%',
          backgroundColor: p.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.26)',
        }}
      />
      <Animated.View
        style={{
          width: K,
          height: K,
          borderRadius: K / 2,
          backgroundColor: '#ffffff',
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, W - K - 6] }) },
          ],
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      />
    </Tap>
  );
}

export function Slider(props: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  format?: (v: number) => string;
  style?: any;
}) {
  const p = usePalette();
  const [w, setW] = useState(0);
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const ratio = Math.max(0, Math.min(1, (props.value - min) / (max - min)));
  const wRef = useRef(0);
  wRef.current = w;
  const cb = useRef(props.onChange);
  cb.current = props.onChange;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  function setFromX(x: number) {
    const width = wRef.current;
    if (width <= 0) return;
    const r = Math.max(0, Math.min(1, x / width));
    const raw = min + r * (max - min);
    const snapped = Math.round(raw / step) * step;
    cb.current(Number(snapped.toFixed(4)));
  }

  return (
    <View style={[{ marginBottom: 12 }, props.style]}>
      {props.label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 12.5, color: p.sub, fontWeight: '600' }}>{props.label}</Text>
          <Text style={{ fontSize: 12.5, color: p.primary, fontWeight: '700' }}>
            {props.format ? props.format(props.value) : String(props.value)}
          </Text>
        </View>
      ) : null}
      <View
        {...pan.panHandlers}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: 34, justifyContent: 'center' }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: p.track, overflow: 'hidden' }}>
          <View
            style={{
              width: `${ratio * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: p.primary,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: Math.max(0, ratio * w - 11),
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: p.primary,
            shadowColor: p.primary,
            shadowOpacity: 0.35,
            shadowRadius: 5,
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}

export function Result(props: { label: string; value: string; copyable?: boolean }) {
  const p = usePalette();
  const [done, setDone] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.line,
      }}>
      <Text style={{ fontSize: 14, color: p.sub }}>{props.label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Text
          selectable
          style={{ fontSize: 15, color: p.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
          {props.value}
        </Text>
        {props.copyable !== false ? (
          <Tap
            hitSlop={8}
            onPress={() => {
              copyText(props.value);
              setDone(true);
              setTimeout(() => setDone(false), 1200);
            }}>
            <Icon name={done ? 'check' : 'copy'} size={16} color={done ? p.ok : p.faint} />
          </Tap>
        ) : null}
      </View>
    </View>
  );
}

export function KV(props: { k: string; v: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
      <Text style={{ fontSize: 14, color: p.sub }}>{props.k}</Text>
      <Text style={{ fontSize: 14, color: p.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>
        {props.v}
      </Text>
    </View>
  );
}

export function Row(props: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flexDirection: 'row', gap: 10 }, props.style]}>{props.children}</View>;
}

export function Loading(props: { text?: string }) {
  const p = usePalette();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.2, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [a]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
      <Animated.View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: p.primary,
          opacity: a,
        }}
      />
      <Text style={{ fontSize: 13, color: p.sub }}>{props.text ?? '处理中…'}</Text>
    </View>
  );
}

export function Empty(props: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 26, gap: 8 }}>
      <Icon name="info" size={26} color={p.faint} />
      <Text style={{ fontSize: 13, color: p.faint, textAlign: 'center' }}>{props.text}</Text>
    </View>
  );
}

/** 图标磁贴：渐变底 + 线性图标（首页与列表统一视觉） */
export function IconTile(props: {
  name: IconName;
  size?: number;
  from: string;
  to: string;
  radius?: number;
}) {
  const size = props.size ?? 42;
  const r = props.radius ?? 13;
  const id = useMemo(() => 't' + Math.random().toString(36).slice(2, 8), []);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: props.from,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={props.from} />
            <Stop offset="1" stopColor={props.to} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
      </Svg>
      <Icon name={props.name} size={size * 0.53} color="#ffffff" strokeWidth={1.75} />
    </View>
  );
}

/** 头部圆形玻璃按钮（主题切换等） */
export function RoundButton(props: {
  icon: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  style?: any;
  size?: number;
}) {
  const p = usePalette();
  const size = props.size ?? 40;
  return (
    <Tap
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: p.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.cardBorder,
        },
        props.style,
      ]}>
      <GlassLayer radius={size / 2} tone="button" />
      <Icon name={props.icon} size={size * 0.48} color={p.text} />
    </Tap>
  );
}

/** 设置行：左侧标题+说明、右侧控件（ColorOS 设置页同款排布） */
export function SettingRow(props: {
  title: string;
  desc?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: any;
}) {
  const p = usePalette();
  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 13,
          borderBottomWidth: props.last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: p.line,
        },
        props.style,
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: p.text }}>{props.title}</Text>
        {props.desc ? (
          <Text style={{ fontSize: 12, color: p.sub, lineHeight: 17, marginTop: 3 }}>{props.desc}</Text>
        ) : null}
      </View>
      {props.right}
      {props.onPress && !props.right ? (
        <Icon name="next" size={18} color={p.faint} strokeWidth={2} />
      ) : null}
    </View>
  );
  if (props.onPress) {
    return <Tap onPress={props.onPress}>{body}</Tap>;
  }
  return body;
}

/** 数值大字展示 */
export function BigNumber(props: { text: string; sub?: string; style?: any }) {
  const p = usePalette();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 6 }, props.style]}>
      <Text
        style={{
          fontSize: 34,
          fontWeight: '700',
          color: p.primary,
          fontVariant: ['tabular-nums'],
        }}>
        {props.text}
      </Text>
      {props.sub ? (
        <Text style={{ fontSize: 12.5, color: p.sub, marginTop: 2 }}>{props.sub}</Text>
      ) : null}
    </View>
  );
}

const s = dynStyles(() =>
  StyleSheet.create({
    back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  }),
);

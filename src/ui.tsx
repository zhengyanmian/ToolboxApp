import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
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
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
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
/* 背景层：纯色（不做渐变、不加光晕）                                   */
/* ColorOS 的底是干净的，通透感来自留白与灰阶层级，不是背景上的彩色光斑。 */
/* ------------------------------------------------------------------ */
export function Background() {
  const p = usePalette();
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: p.bg }]}
    />
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
/* 玻璃质感层                                                          */
/* 规则（参考开源 glassmorphism 库的通行做法）：                        */
/*  · 只用「白色 → 全透明」的单向柔光，绝不掺黑——掺黑会在下半部分糊出   */
/*    一块脏影子，就是"上白下黑、又不像渐变"的根源；                     */
/*  · 浅色模式下除主色按钮外一律不铺，否则卡片会被刷成纯白；             */
/*  · 不画顶边高光线（在卡片上会变成一道可见的白边）。                   */
/* ------------------------------------------------------------------ */
let glassSeed = 0;

type GlassTone = 'card' | 'button' | 'primary' | 'soft' | 'danger';

export function GlassLayer(props: { radius: number; tone?: GlassTone }) {
  const p = usePalette();
  const id = useMemo(() => `g${(glassSeed += 1)}`, []);
  const tone = props.tone ?? 'card';
  const dark = p.isDark;

  const top =
    tone === 'primary'
      ? dark
        ? 0.18
        : 0.12
      : dark
      ? tone === 'button'
        ? 0.07
        : 0.04
      : 0;

  if (top <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: props.radius, overflow: 'hidden' }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={top} />
            <Stop offset="0.42" stopColor="#ffffff" stopOpacity={top * 0.26} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 通用按压组件：柔性反馈（挤压 + 惯性回弹）+「凝光」跟随手指            */
/* ColorOS 17 的两个核心手感：                                          */
/*   · 柔性反馈：按下时轻微挤压，松手用带 bounce 的 spring 回弹          */
/*   · 凝光视效：一团柔光从按下的位置扩散，松手后缓慢消退               */
/* ------------------------------------------------------------------ */
export function Tap(props: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: number;
  /** 兼容旧调用：Android 涟漪默认开启，这个参数已无作用 */
  glow?: boolean;
  glowColor?: string;
}) {
  const p = usePalette();
  const v = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(v, {
      toValue: props.scaleTo ?? 0.958,
      useNativeDriver: true,
      speed: 55,
      bounciness: 0,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(v, {
      toValue: 1,
      useNativeDriver: true,
      speed: 15,
      bounciness: 9,
    }).start();
  };

  return (
    <A_Press
      disabled={props.disabled}
      hitSlop={props.hitSlop}
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      // 涟漪交给系统渲染（RippleDrawable）：硬件加速、从触点扩散、
      // 自动按 borderRadius 裁剪。自己用 View/SVG 画的圆永远做不出这个质感。
      android_ripple={{
        color: p.isDark ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.10)',
        borderless: false,
      }}
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
  /** 不要顶部那段用途说明（计算器这类整屏工具用） */
  noDetail?: boolean;
  /** 不要头部（整屏工具自己画控件，比如尺子） */
  headerless?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const detail = props.id && !props.noDetail ? DETAILS[props.id] : undefined;

  // 进场动效：整页轻微上移淡入（只做一次，native 驱动）
  const enter = useRef(new Animated.Value(0)).current;

  // 只淡入、不做位移：位移会和页面转场叠在一起，看起来就会「先冒出来再跳到顶上」
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const body = (
    <>
      {detail ? (
        <View
          style={{
            backgroundColor: p.primarySoft,
            borderRadius: 18,
            padding: 13,
            marginBottom: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.primary + '33',
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
      <Animated.View style={{ flex: 1, opacity: enter }}>
        {/* 头部：一颗独立的圆形返回按钮 + 居中的纯文字标题（不再做成一条长条） */}
        {props.headerless ? null : (
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 14,
            height: insets.top + 66,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          {props.onBack ? (
            <RoundButton icon="chevron" size={40} onPress={props.onBack} />
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}
          <Text
            numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '600', color: p.text }}>
            {props.title}
          </Text>
          <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            {props.right}
          </View>
        </View>
        )}
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
  const radius = 26;
  const style = [
    {
      backgroundColor: p.card,
      borderRadius: radius,
      padding: props.pad ?? 15,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.cardBorder,
      // 不再使用 elevation / shadow：Android 上带透明背景的 elevation
      // 会渲染成一块方形阴影，就是用户看到的“按钮下面的正方形色块”。
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
      <Tap onPress={props.onPress} glow style={style}>
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
  const palette: Record<
    string,
    { bg: string; fg: string; border: string; tone: GlassTone | null }
  > = {
    primary: { bg: p.primary, fg: p.onPrimary, border: 'transparent', tone: 'primary' },
    plain: { bg: p.card, fg: p.primary, border: p.primary + '33', tone: 'button' },
    soft: { bg: p.primarySoft, fg: p.primary, border: 'transparent', tone: 'soft' },
    ghost: { bg: 'transparent', fg: p.text, border: p.line, tone: null },
    danger: { bg: p.warn + '18', fg: p.warn, border: 'transparent', tone: 'danger' },
  };
  const k = palette[kind];
  const sm = props.size === 'sm';
  const radius = kind === 'ghost' ? 18 : 999;
  return (
    <Tap
      onPress={props.onPress}
      disabled={props.disabled}
      glow
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
          minHeight: sm ? 34 : 46,
          paddingVertical: sm ? 7 : 12,
          paddingHorizontal: sm ? 13 : 16,
          overflow: 'hidden',
          backgroundColor: k.bg,
          borderWidth: kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: k.border,
        },
        props.style,
      ]}>
      {props.icon ? <Icon name={props.icon} size={sm ? 15 : 17} color={k.fg} /> : null}
      <Text style={{ color: k.fg, fontSize: sm ? 13 : 14.5, fontWeight: '600' }} numberOfLines={1}>
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
      glow
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
          borderColor: props.active ? 'transparent' : p.chipBorder,
        },
        props.style,
      ]}>
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
      <View
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: p.input,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: focus ? p.primary : p.line,
        }}>
        <GlassLayer radius={14} tone="soft" />
        <TextInput
          style={{
            paddingHorizontal: 13,
            paddingVertical: Platform.OS === 'android' ? 11 : 12,
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 日期 / 时间选择器                                                    */
/* 目的：任何需要日期的地方都不再让用户一个字符一个字符地敲键盘。        */
/* ------------------------------------------------------------------ */
const WD_CN = ['日', '一', '二', '三', '四', '五', '六'];

const p2 = (n: number) => (n < 10 ? '0' + n : String(n));

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function nowHM(): string {
  const d = new Date();
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function parseDateStr(v: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

type PickMode = 'date' | 'time' | 'datetime';

export function DatePickerSheet(props: {
  visible: boolean;
  value: string;
  mode?: PickMode;
  title?: string;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  const p = usePalette();
  const mode = props.mode ?? 'date';
  const withDate = mode !== 'time';
  const withTime = mode !== 'date';

  const base = useMemo(() => {
    const dv = parseDateStr(props.value);
    const tm = /(\d{1,2}):(\d{2})/.exec(props.value);
    const d = dv ?? new Date();
    if (tm) d.setHours(Number(tm[1]), Number(tm[2]), 0, 0);
    return d;
    // 每次打开时按当前值重算即可
  }, [props.value, props.visible]);

  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());
  const [day, setDay] = useState(base.getDate());
  const [hour, setHour] = useState(base.getHours());
  const [minute, setMinute] = useState(base.getMinutes());

  useEffect(() => {
    if (!props.visible) return;
    setYear(base.getFullYear());
    setMonth(base.getMonth());
    setDay(base.getDate());
    setHour(base.getHours());
    setMinute(base.getMinutes());
  }, [props.visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = new Date(year, month, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const commit = () => {
    const dateStr = `${year}-${p2(month + 1)}-${p2(day)}`;
    const timeStr = `${p2(hour)}:${p2(minute)}`;
    props.onPick(mode === 'time' ? timeStr : mode === 'date' ? dateStr : `${dateStr} ${timeStr}`);
    props.onClose();
  };

  const cellW = `${100 / 7}%` as const;

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable
        onPress={props.onClose}
        style={{ flex: 1, backgroundColor: p.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: p.cardSolid,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 20,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: p.cardBorder,
            overflow: 'hidden',
          }}>
          <GlassLayer radius={26} tone="card" />
          {/* 抓手 */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: p.line,
              marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: p.text }}>
              {props.title ?? (mode === 'time' ? '选择时间' : '选择日期')}
            </Text>
            <Tap onPress={props.onClose} hitSlop={10}>
              <Icon name="close" size={20} color={p.sub} />
            </Tap>
          </View>

          {withDate ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Tap onPress={() => shift(-1)} hitSlop={8} style={s.nav}>
                  <Icon name="chevron" size={18} color={p.text} />
                </Tap>
                <Text
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 15.5,
                    fontWeight: '700',
                    color: p.text,
                  }}>
                  {year} 年 {month + 1} 月
                </Text>
                <Tap
                  onPress={() => shift(1)}
                  hitSlop={8}
                  style={[s.nav, { transform: [{ rotate: '180deg' }] }]}>
                  <Icon name="chevron" size={18} color={p.text} />
                </Tap>
              </View>
              <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                {WD_CN.map((w) => (
                  <Text
                    key={w}
                    style={{
                      width: cellW,
                      textAlign: 'center',
                      fontSize: 11.5,
                      color: p.faint,
                      paddingVertical: 4,
                    }}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((d, i) => {
                  if (d === null) return <View key={`e${i}`} style={{ width: cellW, height: 40 }} />;
                  const on = d === day;
                  const isToday = `${year}-${p2(month + 1)}-${p2(d)}` === today;
                  return (
                    <View key={`d${i}`} style={{ width: cellW, height: 40, padding: 2 }}>
                      <Tap
                        onPress={() => setDay(d)}
                        style={{
                          flex: 1,
                          borderRadius: 11,
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          backgroundColor: on ? p.primary : 'transparent',
                          borderWidth: isToday && !on ? StyleSheet.hairlineWidth : 0,
                          borderColor: p.primary + '66',
                        }}>
                        {on ? <GlassLayer radius={11} tone="primary" /> : null}
                        <Text
                          style={{
                            fontSize: 14.5,
                            fontWeight: on || isToday ? '700' : '500',
                            color: on ? p.onPrimary : isToday ? p.primary : p.text,
                          }}>
                          {d}
                        </Text>
                      </Tap>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {withTime ? (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12.5, color: p.sub, fontWeight: '600', marginBottom: 6 }}>
                时间
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <StepBox
                  value={p2(hour)}
                  onDec={() => setHour((h) => (h + 23) % 24)}
                  onInc={() => setHour((h) => (h + 1) % 24)}
                />
                <Text style={{ fontSize: 18, fontWeight: '700', color: p.sub }}>:</Text>
                <StepBox
                  value={p2(minute)}
                  onDec={() => setMinute((m) => (m + 55) % 60)}
                  onInc={() => setMinute((m) => (m + 5) % 60)}
                />
                <View style={{ flex: 1 }}>
                  <Chip text="现在" icon="clock" onPress={() => {
                    const n = new Date();
                    setHour(n.getHours());
                    setMinute(n.getMinutes());
                  }} />
                </View>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Btn
              text="今天"
              kind="plain"
              fit
              onPress={() => {
                const n = new Date();
                setYear(n.getFullYear());
                setMonth(n.getMonth());
                setDay(n.getDate());
                if (withTime) {
                  setHour(n.getHours());
                  setMinute(n.getMinutes());
                }
              }}
            />
            <Btn text="确定" onPress={commit} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function StepBox(props: { value: string; onInc: () => void; onDec: () => void }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: p.input,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.line,
      }}>
      <Tap onPress={props.onDec} hitSlop={6} style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
        <Icon name="minus" size={16} color={p.text} />
      </Tap>
      <Text
        style={{
          minWidth: 34,
          textAlign: 'center',
          fontSize: 17,
          fontWeight: '700',
          color: p.text,
          fontVariant: ['tabular-nums'],
        }}>
        {props.value}
      </Text>
      <Tap onPress={props.onInc} hitSlop={6} style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
        <Icon name="plus" size={16} color={p.text} />
      </Tap>
    </View>
  );
}

/** 点一下就弹出日历/时间面板的输入行（替代手打日期文本） */
export function DateField(props: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  mode?: PickMode;
  placeholder?: string;
  style?: any;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const mode = props.mode ?? 'date';
  return (
    <View style={[{ marginBottom: 12 }, props.style]}>
      {props.label ? (
        <Text style={{ fontSize: 12.5, color: p.sub, marginBottom: 6, fontWeight: '600' }}>
          {props.label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: p.input,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.line,
        }}>
        <GlassLayer radius={14} tone="soft" />
        <Tap
          onPress={() => setOpen(true)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 13,
            paddingVertical: 12,
          }}>
          <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={16} color={p.primary} />
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              color: props.value ? p.text : p.faint,
              fontVariant: ['tabular-nums'],
            }}>
            {props.value || props.placeholder || (mode === 'time' ? '选择时间' : '选择日期')}
          </Text>
          <Icon name="chevron" size={16} color={p.faint} />
        </Tap>
        <Tap
          onPress={() => setOpen(true)}
          hitSlop={6}
          style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: p.primary }}>选择</Text>
        </Tap>
      </View>
      <DatePickerSheet
        visible={open}
        value={props.value}
        mode={mode}
        onClose={() => setOpen(false)}
        onPick={props.onChange}
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
      glow
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

const s = dynStyles((C) =>
  StyleSheet.create({
    back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    nav: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.chip,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.chipBorder,
    },
  }),
);

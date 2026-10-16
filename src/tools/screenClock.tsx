import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lunar } from 'lunar-typescript';
import { dynStyles, Icon, Slider, Tap } from '../ui';
import type { IconName } from '../icons';
import { usePalette } from '../theme';
import { setImmersive, setKeepScreenOn, setOrientation } from '../native';

/** 预设字色（下标 0 代表「跟随主题」：浅色模式深字、深色模式浅字） */
const PRESETS = ['#67e8f9', '#fcd34d', '#86efac', '#f9a8d4', '#f87171', '#a78bfa'];
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 数字样式循环：常规 / 细体 / 斜体 / 描边发光感 */
const DIGIT_STYLES = [
  { key: 'normal', label: '常规', weight: '300' as const, italic: false, glow: false },
  { key: 'thin', label: '细体', weight: '100' as const, italic: false, glow: false },
  { key: 'italic', label: '斜体', weight: '300' as const, italic: true, glow: false },
  { key: 'glow', label: '描边', weight: '400' as const, italic: false, glow: true },
];

export default function ScreenClock({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [now, setNow] = useState(new Date());
  const [is24, setIs24] = useState(true);
  const [showSec, setShowSec] = useState(true);
  const [portrait, setPortrait] = useState(false);
  const [mainSize, setMainSize] = useState(150);
  const [secRatio, setSecRatio] = useState(0.42);
  const [colorIdx, setColorIdx] = useState(0);
  const [styleIdx, setStyleIdx] = useState(0);
  const [panel, setPanel] = useState<'size' | 'color' | null>(null);
  const [visible, setVisible] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 进入：沉浸 + 常亮 + 默认横屏；退出：全部还原（组件卸载时同样清理） */
  useEffect(() => {
    setOrientation('landscape');
    setImmersive(true);
    setKeepScreenOn(true);
    const t = setInterval(() => setNow(new Date()), 250);
    return () => {
      clearInterval(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setImmersive(false);
      setOrientation('auto');
      setKeepScreenOn(false);
    };
  }, []);

  /** 重置 4 秒无操作自动淡出 */
  const schedule = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setVisible(false);
          setPanel(null);
        }
      });
    }, 4000);
  }, [anim]);

  const showBar = useCallback(() => {
    setVisible(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    schedule();
  }, [anim, schedule]);

  const hideBar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setVisible(false);
        setPanel(null);
      }
    });
  }, [anim]);

  /* 每次操作工具条都刷新淡出计时，避免"刚点完就消失" */
  const act = useCallback(
    (fn: () => void) => () => {
      fn();
      if (visible) schedule();
      else showBar();
    },
    [visible, schedule, showBar],
  );

  const hh = now.getHours();
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const main =
    (is24 ? String(hh) : String(h12)).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');

  const lunar = Lunar.fromDate(now);
  const dateLine = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${
    WEEK[now.getDay()]
  } · 农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;

  const clockColor = colorIdx === 0 ? (p.isDark ? '#f8fafc' : '#0b1220') : PRESETS[colorIdx - 1];
  const ds = DIGIT_STYLES[styleIdx];

  /* 竖屏：每个字符独占一行，按可用高度自适应缩放；横屏：按可用宽度收敛，避免溢出 */
  const availH = height - insets.top - insets.bottom - 96;
  const portraitFit = Math.floor(availH / (main.length + (showSec ? 1.6 : 0.5)));
  const landFit = Math.floor((width - 40) / (main.length * 0.58 + (showSec ? 0.9 : 0)));
  const effMain = portrait
    ? Math.max(22, Math.min(mainSize, portraitFit))
    : Math.max(22, Math.min(mainSize, landFit));
  const effSec = Math.round(effMain * secRatio);

  const digitStyle = (size: number): any => ({
    color: clockColor,
    fontSize: size,
    lineHeight: size * 1.06,
    fontWeight: ds.weight,
    fontStyle: ds.italic ? 'italic' : 'normal',
    ...(ds.glow
      ? {
          textShadowColor: clockColor,
          textShadowRadius: Math.max(4, size * 0.05),
          textShadowOffset: { width: 0, height: 0 },
        }
      : null),
  });

  const timeBlock = portrait ? (
    <View style={{ alignItems: 'center' }}>
      {main.split('').map((ch, i) => (
        <Text key={i} style={[st.digit, digitStyle(effMain)]}>
          {ch}
        </Text>
      ))}
      {showSec ? (
        <Text style={[st.digit, digitStyle(effSec), { marginTop: effMain * 0.14 }]}>{sec}</Text>
      ) : null}
    </View>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={[st.digit, digitStyle(effMain)]}>{main}</Text>
      {showSec ? (
        <Text
          style={[
            st.digit,
            digitStyle(effSec),
            { marginLeft: Math.max(8, effMain * 0.06), marginBottom: effMain * 0.15 },
          ]}>
          {sec}
        </Text>
      ) : null}
    </View>
  );

  const glass = p.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.76)';
  const glassLine = p.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(17,24,39,0.08)';
  const panelBg = p.isDark ? 'rgba(14,18,26,0.86)' : 'rgba(255,255,255,0.92)';

  return (
    <View style={[st.root, { backgroundColor: p.isDark ? '#05070b' : '#ffffff' }]}>
      <StatusBar hidden />
      {/* 任意处轻触呼出/隐藏工具条 */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => (visible ? hideBar() : showBar())}
      />

      <View style={st.center} pointerEvents="none">
        {timeBlock}
        <Text style={[st.date, { color: clockColor }]}>{dateLine}</Text>
      </View>

      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          st.dock,
          {
            paddingBottom: insets.bottom + 16,
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            ],
          },
        ]}>
        {panel === 'size' ? (
          <View
            style={[
              st.panel,
              { backgroundColor: panelBg, borderColor: glassLine },
            ]}>
            <Slider
              label="主字号"
              value={mainSize}
              min={40}
              max={260}
              step={1}
              onChange={setMainSize}
              format={(v) => `${Math.round(v)}`}
              style={{ marginBottom: 6 }}
            />
            <Slider
              label="秒字号（相对主字号倍率）"
              value={secRatio}
              min={0.2}
              max={1.2}
              step={0.02}
              onChange={setSecRatio}
              format={(v) => `${v.toFixed(2)}×`}
              style={{ marginBottom: 2 }}
            />
          </View>
        ) : null}

        {panel === 'color' ? (
          <View style={[st.panel, st.colorPanel, { backgroundColor: panelBg, borderColor: glassLine }]}>
            <Tap onPress={act(() => setColorIdx(0))} style={st.dotWrap}>
              <View
                style={[
                  st.dotBig,
                  { backgroundColor: p.isDark ? '#f8fafc' : '#0b1220' },
                  colorIdx === 0 ? { borderColor: p.primary } : null,
                ]}
              />
            </Tap>
            {PRESETS.map((c, i) => (
              <Tap key={c} onPress={act(() => setColorIdx(i + 1))} style={st.dotWrap}>
                <View
                  style={[
                    st.dotBig,
                    { backgroundColor: c },
                    colorIdx === i + 1 ? { borderColor: p.primary } : null,
                  ]}
                />
              </Tap>
            ))}
          </View>
        ) : null}

        <View style={[st.bar, { backgroundColor: glass, borderColor: glassLine, shadowColor: p.cardShadow }]}>
          <IconBtn name="chevron" onPress={onBack} />
          <IconBtn
            name="swap"
            onPress={act(() => {
              const np = !portrait;
              setPortrait(np);
              setOrientation(np ? 'portrait' : 'landscape');
            })}
          />
          <IconBtn name="clock" active={!is24} onPress={act(() => setIs24((v) => !v))} />
          <IconBtn name="timer" active={!showSec} onPress={act(() => setShowSec((v) => !v))} />
          <IconBtn
            name="palette"
            dot={clockColor}
            active={panel === 'color'}
            onPress={act(() => setPanel(panel === 'color' ? null : 'color'))}
          />
          <IconBtn
            name="pen"
            active={styleIdx === DIGIT_STYLES.length - 1}
            onPress={act(() => setStyleIdx((i) => (i + 1) % DIGIT_STYLES.length))}
          />
          <IconBtn
            name="letters"
            active={panel === 'size'}
            onPress={act(() => setPanel(panel === 'size' ? null : 'size'))}
          />
        </View>
      </Animated.View>
    </View>
  );
}

/** 工具条上的小圆形玻璃图标按钮 */
function IconBtn(props: { name: IconName; onPress: () => void; active?: boolean; dot?: string }) {
  const p = usePalette();
  const bg = props.active
    ? p.isDark
      ? 'rgba(255,255,255,0.24)'
      : 'rgba(47,107,255,0.18)'
    : p.isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(255,255,255,0.72)';
  const fg = props.active ? (p.isDark ? '#ffffff' : p.primary) : p.isDark ? '#eef2f8' : '#1f2937';
  return (
    <Tap
      onPress={props.onPress}
      scaleTo={0.9}
      style={[
        st.ibtn,
        { backgroundColor: bg, borderColor: p.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(17,24,39,0.10)' },
      ]}>
      {props.dot ? <View style={[st.dot, { backgroundColor: props.dot }]} /> : null}
      <Icon name={props.name} size={18} color={fg} />
    </Tap>
  );
}

const st = dynStyles(() =>
  StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
    digit: { fontVariant: ['tabular-nums'], textAlign: 'center' },
    date: {
      fontSize: 14,
      marginTop: 16,
      letterSpacing: 0.6,
      textAlign: 'center',
      paddingHorizontal: 24,
      opacity: 0.6,
    },
    dock: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      shadowOpacity: 0.8,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    panel: {
      width: 316,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
    },
    colorPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingBottom: 10,
    },
    ibtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    dot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
    dotWrap: { padding: 2 },
    dotBig: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  }),
);

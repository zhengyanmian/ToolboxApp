import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lunar } from 'lunar-typescript';
import { Btn, dynStyles, Icon, Slider, Tap } from '../ui';
import type { IconName } from '../icons';
import { usePalette } from '../theme';
import { setImmersive, setKeepScreenOn, setOrientation } from '../native';

/** 预设字色（下标 0 代表「跟随主题」：浅色模式深字、深色模式浅字） */
const PRESETS = [
  '#67e8f9',
  '#fcd34d',
  '#86efac',
  '#f9a8d4',
  '#f87171',
  '#a78bfa',
  '#ffffff',
  '#0ea5e9',
];
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
  /** 时钟自己的底色（跟 App 主题解耦：白天放桌上用白底更清楚） */
  const [light, setLight] = useState(false);
  const [custom, setCustom] = useState('');
  const [hex, setHex] = useState('');

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

  const autoColor = light ? '#0b1220' : '#f8fafc';
  const clockColor = custom || (colorIdx === 0 ? autoColor : PRESETS[colorIdx - 1]);
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
    // alignItems:'baseline' 让秒与主数字共用同一条基线，秒字号放大也不会错位
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={[st.digit, digitStyle(effMain), { includeFontPadding: false }]}>{main}</Text>
      {showSec ? (
        <Text
          style={[
            st.digit,
            digitStyle(effSec),
            { includeFontPadding: false, marginLeft: Math.max(8, effMain * 0.06) },
          ]}>
          {sec}
        </Text>
      ) : null}
    </View>
  );

  /** 工具条始终用「凝光」玻璃：随时钟底色反色，保证在纯黑/纯白底上都清楚 */
  const darkUi = !light;
  const glass = darkUi ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.85)';
  const glassLine = darkUi ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.08)';
  const panelBg = darkUi ? 'rgba(16,20,28,0.9)' : 'rgba(255,255,255,0.94)';
  const uiFg = darkUi ? '#eef2f8' : '#1f2937';
  const uiSub = darkUi ? 'rgba(238,242,248,0.6)' : 'rgba(31,41,55,0.55)';

  return (
    <View style={[st.root, { backgroundColor: light ? '#f4f5f9' : '#04060a' }]}>
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
          <View
            style={[
              st.panel,
              { backgroundColor: panelBg, borderColor: glassLine, paddingBottom: 12 },
            ]}>
            <Text style={[st.panelLabel, { color: uiSub }]}>字色</Text>
            <View style={st.colorRow}>
              <Tap
                onPress={act(() => {
                  setCustom('');
                  setColorIdx(0);
                })}
                style={st.dotWrap}>
                <View
                  style={[
                    st.dotBig,
                    { backgroundColor: autoColor },
                    (colorIdx === 0 && !custom) ? { borderColor: p.primary } : null,
                  ]}
                />
              </Tap>
              {PRESETS.map((c, i) => (
                <Tap
                  key={c}
                  onPress={act(() => {
                    setCustom('');
                    setColorIdx(i + 1);
                  })}
                  style={st.dotWrap}>
                  <View
                    style={[
                      st.dotBig,
                      { backgroundColor: c },
                      colorIdx === i + 1 && !custom ? { borderColor: p.primary } : null,
                    ]}
                  />
                </Tap>
              ))}
            </View>

            <View style={st.hexRow}>
              <View style={[st.hexBox, { borderColor: glassLine }]}>
                <TextInput
                  value={hex}
                  onChangeText={setHex}
                  placeholder="#7dd3fc"
                  placeholderTextColor={uiSub}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[st.hexInput, { color: uiFg }]}
                />
                <View style={[st.hexPreview, { backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : uiSub }]} />
              </View>
              <Btn
                text="用这个色"
                size="sm"
                fit
                onPress={act(() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(hex)) setCustom(hex.toUpperCase());
                })}
              />
            </View>

            <View style={[st.bgRow, { borderTopColor: glassLine }]}>
              <Text style={[st.panelLabel, { color: uiSub, marginBottom: 0 }]}>底色</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Tap
                  onPress={act(() => setLight(false))}
                  style={[
                    st.bgChip,
                    { borderColor: !light ? p.primary : glassLine, backgroundColor: !light ? p.primarySoft : 'transparent' },
                  ]}>
                  <View style={[st.bgDot, { backgroundColor: '#06080d' }]} />
                  <Text style={{ fontSize: 12.5, color: !light ? p.primary : uiFg, fontWeight: '600' }}>深色</Text>
                </Tap>
                <Tap
                  onPress={act(() => setLight(true))}
                  style={[
                    st.bgChip,
                    { borderColor: light ? p.primary : glassLine, backgroundColor: light ? p.primarySoft : 'transparent' },
                  ]}>
                  <View style={[st.bgDot, { backgroundColor: '#ffffff' }]} />
                  <Text style={{ fontSize: 12.5, color: light ? p.primary : uiFg, fontWeight: '600' }}>浅色</Text>
                </Tap>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[st.bar, { backgroundColor: glass, borderColor: glassLine }]}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: '8%',
              right: '8%',
              top: 0,
              height: StyleSheet.hairlineWidth * 2,
              backgroundColor: darkUi ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)',
            }}
          />
          <IconBtn name="chevron" onPress={onBack} dark={darkUi} />
          <IconBtn
            name="rotate"
            onPress={act(() => {
              const np = !portrait;
              setPortrait(np);
              setOrientation(np ? 'portrait' : 'landscape');
            })}
            dark={darkUi}
          />
          <IconBtn name="clock" active={!is24} onPress={act(() => setIs24((v) => !v))} dark={darkUi} />
          <IconBtn name="timer" active={!showSec} onPress={act(() => setShowSec((v) => !v))} dark={darkUi} />
          <IconBtn
            name="palette"
            dot={clockColor}
            active={panel === 'color'}
            onPress={act(() => setPanel(panel === 'color' ? null : 'color'))}
            dark={darkUi}
          />
          <IconBtn
            name="pen"
            active={styleIdx === DIGIT_STYLES.length - 1}
            onPress={act(() => setStyleIdx((i) => (i + 1) % DIGIT_STYLES.length))}
            dark={darkUi}
          />
          <IconBtn
            name={light ? 'sun' : 'moon'}
            onPress={act(() => {
              const nl = !light;
              setLight(nl);
              if (!custom) setColorIdx(0);
            })}
            dark={darkUi}
          />
          <IconBtn
            name="letters"
            active={panel === 'size'}
            onPress={act(() => setPanel(panel === 'size' ? null : 'size'))}
            dark={darkUi}
          />
        </View>
      </Animated.View>
    </View>
  );
}

/** 工具条上的小圆形玻璃图标按钮（ColorOS 凝光质感：柔和渐变 + 发丝高光，无投影） */
function IconBtn(props: {
  name: IconName;
  onPress: () => void;
  active?: boolean;
  dot?: string;
  dark?: boolean;
}) {
  const p = usePalette();
  const dark = props.dark !== false;
  const bg = props.active
    ? dark
      ? 'rgba(255,255,255,0.24)'
      : 'rgba(47,107,255,0.16)'
    : dark
    ? 'rgba(255,255,255,0.09)'
    : 'rgba(255,255,255,0.85)';
  const fg = props.active ? (dark ? '#ffffff' : p.primary) : dark ? '#eef2f8' : '#1f2937';
  return (
    <Tap
      onPress={props.onPress}
      scaleTo={0.9}
      style={[
        st.ibtn,
        {
          backgroundColor: bg,
          borderColor: dark ? 'rgba(255,255,255,0.13)' : 'rgba(17,24,39,0.08)',
        },
      ]}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 3,
          right: 3,
          top: 0,
          height: StyleSheet.hairlineWidth * 2,
          borderRadius: 2,
          backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.95)',
        }}
      />
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
      overflow: 'hidden',
    },
    panel: {
      width: 330,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    panelLabel: { fontSize: 11.5, fontWeight: '600', marginBottom: 8 },
    colorRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
    hexRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    hexBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 10,
    },
    hexInput: { flex: 1, fontSize: 14, paddingVertical: 7, letterSpacing: 0.5 },
    hexPreview: { width: 18, height: 18, borderRadius: 6 },
    bgRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    bgChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    bgDot: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.5)' },
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

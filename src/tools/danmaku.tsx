import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Chip,
  Field,
  GlassLayer,
  Icon,
  IconName,
  SectionTitle,
  Segmented,
  SettingRow,
  Slider,
  Tap,
  Toggle,
  dynStyles,
} from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate, setImmersive, setKeepScreenOn, setOrientation } from '../native';

/** 呈现方式 */
type Mode = 'scroll' | 'blink' | 'static';
/** 滚动方向 */
type Dir = 'left' | 'right';
/** 播放阶段：idle 预览态 / running 播放中 / paused 暂停 */
type Phase = 'idle' | 'running' | 'paused';

const TEXT_COLORS = ['#ffffff', '#ff5b5b', '#ffd166', '#4ade80', '#4cc9f0', '#a78bfa', '#ff8ad8'];
const BG_COLORS = ['#000000', '#0b0f16', '#7f1d1d', '#1e3a8a', '#14532d', '#4c1d95', '#ffffff'];
/** 常用文案，一键填入 */
const TEXT_PRESETS = [
  '大哥大嫂过年好',
  '求让一让',
  '生日快乐',
  '加油！',
  '我爱你',
  '求关注',
  '别拍我',
  '前方高能',
];

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

const HEX = /^#?[0-9a-fA-F]{6}$/;
/** 抽屉圆角 */
const SHEET_R = 28;
/** 玻璃高光层用到的固定颜色：浮在用户自选背景上，因此不跟随主题 */
const GLASS_BASE = 'rgba(22,26,34,0.42)';
const GLASS_BORDER = 'rgba(255,255,255,0.30)';

let glassSeed = 0;

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
  const [landscape, setLandscape] = useState(false);
  const [color, setColor] = useState(TEXT_COLORS[0]);
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [hexIn, setHexIn] = useState('');
  const [bgHexIn, setBgHexIn] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [panel, setPanel] = useState(false);
  const [hintClosed, setHintClosed] = useState(false);
  const [textW, setTextW] = useState(0);

  const x = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const runningRef = useRef(false);
  const progress = useRef(0);
  const cycleRef = useRef(4000);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 横屏大字开关同时也是「手持 90°」开关：开则文字随屏幕旋转 90°
  const rot: 0 | 90 = landscape ? 90 : 0;
  const extent = rot === 90 ? height : width;
  const active = phase === 'running';

  // 沉浸式 + 屏幕常亮；离开页面时全部还原
  useEffect(() => {
    setImmersive(true);
    setKeepScreenOn(true);
    return () => {
      setImmersive(false);
      setKeepScreenOn(false);
      setOrientation('auto');
    };
  }, []);

  // 横屏大字：打开强制 landscape，关闭交回系统自动旋转
  useEffect(() => {
    setOrientation(landscape ? 'landscape' : 'auto');
  }, [landscape]);

  // 记录当前位移进度：暂停后据此在原位置续播，而不是从头重来
  useEffect(() => {
    const id = x.addListener(({ value }) => {
      progress.current = value;
    });
    return () => x.removeListener(id);
  }, [x]);

  // 一次完整行程的耗时：像素速度恒定，所以按「屏幕宽 + 实测文字宽」换算
  const cycleMs =
    mode === 'scroll' && textW > 0 ? Math.max(1200, ((extent + textW) / (240 * speed)) * 1000) : 4000;
  cycleRef.current = cycleMs;

  // 匀速跑马灯：单段 timing 完成后回到起点递归；位移全程只用 native 驱动，
  // 复位用 setValue（不是 JS 驱动的动画），因此不会触发「同节点混用两种驱动」的崩溃。
  const runScroll = (from: number) => {
    const f = Math.min(0.999, Math.max(0, from));
    const a = Animated.timing(x, {
      toValue: 1,
      duration: Math.max(24, cycleRef.current * (1 - f)),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.current = a;
    a.start(({ finished }) => {
      if (!finished || !runningRef.current) return;
      x.setValue(0);
      progress.current = 0;
      runScroll(0);
    });
  };

  const stopAnim = () => {
    anim.current?.stop();
    anim.current = null;
  };

  // 统一驱动：滚动用递归 timing（可精确暂停/续播），闪烁单独用 loop
  useEffect(() => {
    runningRef.current = phase === 'running';
    stopAnim();
    if (mode !== 'scroll') {
      x.setValue(0);
      progress.current = 0;
      return;
    }
    if (phase === 'running' && textW > 0) {
      // 首次播放从「居中位置」起跑，与预览态无缝衔接；暂停续播则接着走
      const from = progress.current > 0.002 ? progress.current : 0.5;
      if (from !== progress.current) {
        x.setValue(from);
        progress.current = from;
      }
      runScroll(from);
    } else if (phase === 'idle') {
      x.setValue(0);
      progress.current = 0;
    }
    // paused：不做任何事，位移冻结在原地
  }, [mode, phase, textW, speed, extent, dir, rot, x]);

  // 闪烁动画（独立节点，不与位移共用 Animated.Value）
  useEffect(() => {
    if (mode !== 'blink' || phase !== 'running') {
      blink.setValue(1);
      return;
    }
    blink.setValue(1);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.12, duration: 520, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [mode, phase, blink]);

  // 卸载时清掉定时器与动画
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      stopAnim();
    },
    [],
  );

  /** 回到编辑态：停在预览 + 打开设置抽屉 */
  const openEdit = () => {
    setPhase('idle');
    setPanel(true);
  };

  const toggleRun = () => {
    nativeVibrate('0,12');
    setPhase(phase === 'running' ? 'paused' : 'running');
  };

  // 单击：暂停/继续；双击：回到编辑态。单击延迟 240ms 执行以便区分双击
  const onBackdrop = () => {
    if (panel) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      openEdit();
      return;
    }
    lastTap.current = now;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      if (phase !== 'idle') toggleRun();
    }, 240);
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

  /** 「占满屏幕」：让文字高度约占屏幕 60% 的近似字号 */
  const fitScreen = () => {
    const target = landscape ? Math.round(height * 0.42) : Math.round(width * 0.22);
    setSize(Math.max(40, Math.min(200, target)));
    nativeVibrate('0,12');
  };

  const showText = text.length ? text : '请输入弹幕内容';
  const translate = x.interpolate({
    inputRange: [0, 1],
    outputRange: dir === 'left' ? [extent, -textW] : [-textW, extent],
  });
  const rotStyle = rot === 90 ? { transform: [{ rotate: '90deg' as const }] } : null;
  // 滚动中靠左锚定以保证像素位移精确；预览/静止类模式水平居中
  const centerAlign = mode !== 'scroll' || phase === 'idle' || rot === 90;
  // 抽屉打开时把预览整体上移，避免被面板挡住
  const previewShift = panel ? -Math.round(height * 0.17) : 0;
  const mainLabel = mode === 'scroll' ? '开始滚动' : mode === 'blink' ? '开始闪烁' : '开始演示';
  // 抽屉里的实时预览条：按比例缩小展示，改颜色/字号能立刻看到
  const previewFont = Math.max(14, Math.min(46, Math.round(size * 0.28)));
  const playLabel = phase === 'running' ? '暂停播放' : phase === 'paused' ? '继续播放' : '开始播放';

  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <StatusBar hidden />

      {/* 预览 / 滚动层 */}
      <View
        pointerEvents="none"
        style={[
          st.layer,
          centerAlign ? { alignItems: 'center' } : null,
          { transform: [{ translateY: previewShift }] },
        ]}>
        {mode === 'scroll' && phase !== 'idle' ? (
          <Animated.View
            style={[
              st.mover,
              { transform: rot === 90 ? [{ translateY: translate }] : [{ translateX: translate }] },
            ]}>
            <Text numberOfLines={1} allowFontScaling={false} style={[st.big, { color, fontSize: size }, rotStyle]}>
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

      {/* 隐藏测量层：始终渲染，取文字真实像素宽度（位移计算依赖它） */}
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        pointerEvents="none"
        onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
        style={[st.big, st.measure, { color, fontSize: size }]}>
        {showText}
      </Text>

      {/* 单击/双击接收层（位于文字之上、控件之下） */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackdrop} />

      <View style={[st.top, { top: insets.top + 8 }]}>
        <GlassBtn icon="chevron" onPress={onBack} />
        <View style={{ flex: 1 }} />
        <GlassBtn icon="sliders" onPress={openEdit} />
      </View>

      {/* 主按钮：一个明显的「开始滚动」 */}
      {phase === 'idle' && !panel ? (
        <View style={[st.mainWrap, { bottom: insets.bottom + 30 }]}>
          <Tap onPress={toggleRun} style={st.mainBtn} scaleTo={0.96}>
            <GlassLayer radius={999} tone="primary" />
            <Icon name={mode === 'blink' ? 'bolt' : 'play'} size={20} color="#ffffff" />
            <Text style={st.mainText}>{mainLabel}</Text>
          </Tap>
        </View>
      ) : null}

      {/* 手势提示条（可关闭，关闭后本次进入不再出现） */}
      {!hintClosed && phase !== 'idle' && !panel ? (
        <View style={[st.hintWrap, { bottom: insets.bottom + 20 }]}>
          <View style={st.hintPill}>
            <Icon name="touch" size={14} color="#ffffff" />
            <Text style={st.hintText}>{active ? '单击屏幕暂停' : '单击屏幕继续'} · 双击打开设置</Text>
            <GlassBtn icon="close" size={28} onPress={() => setHintClosed(true)} />
          </View>
        </View>
      ) : null}

      {/* 设置抽屉：底部玻璃卡片 */}
      {panel ? (
        <View style={st.sheetWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPanel(false)}>
            <View style={st.scrim} />
          </Pressable>
          <View style={[st.sheet, { marginBottom: insets.bottom + 10 }]}>
            <GlassLayer radius={SHEET_R} tone="card" />
            {/* 拖拽条（下拉关闭的视觉提示） */}
            <View style={st.handle} />
            <View style={st.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={st.sheetTitle}>弹幕设置</Text>
                <Text style={st.sheetSub}>所见即所得，改动即时生效</Text>
              </View>
              <GlassBtn icon="close" size={36} onPress={() => setPanel(false)} />
            </View>

            <ScrollView
              style={{ maxHeight: height * 0.56 }}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}>
              {/* 实时预览条：按当前颜色/字号/背景渲染，改参数立刻可见 */}
              <View style={[st.previewBar, { backgroundColor: bg }]}>
                <Text
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={[st.previewTxt, { color, fontSize: previewFont }]}>
                  {showText}
                </Text>
              </View>

              <SectionTitle text="文字" style={{ marginTop: 4 }} />
              <View style={st.labelRow}>
                <Text style={st.lab}>弹幕文字</Text>
                <View style={st.countRow}>
                  <Text style={st.count}>{text.length} 字</Text>
                  <Tap
                    onPress={() => {
                      setText('');
                      nativeVibrate('0,12');
                    }}
                    disabled={!text.length}
                    style={st.iconBtn}
                    hitSlop={8}>
                    <Icon name="trash" size={17} color={p.sub} />
                  </Tap>
                </View>
              </View>
              <Field value={text} onChange={setText} multiline placeholder="输入要展示的文字" />
              <View style={st.chipWrap}>
                {TEXT_PRESETS.map((t) => (
                  <Chip key={t} text={t} active={text === t} onPress={() => setText(t)} />
                ))}
              </View>

              <SectionTitle text="样式" />
              <Slider
                label="字号"
                value={size}
                onChange={setSize}
                min={40}
                max={200}
                step={1}
                format={(v) => `${Math.round(v)}`}
              />
              <View style={st.chipWrap}>
                <Chip text="占满屏幕" icon="frame" onPress={fitScreen} />
                <Chip
                  text={playLabel}
                  icon={active ? 'pause' : 'play'}
                  onPress={toggleRun}
                  style={{ marginBottom: 6 }}
                />
              </View>

              <Text style={st.lab}>速度</Text>
              <Segmented options={SPEEDS} value={speed} onChange={setSpeed} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>呈现方式</Text>
              <Segmented options={MODES} value={mode} onChange={setMode} style={{ marginBottom: 12 }} />

              <Text style={st.lab}>滚动方向</Text>
              <Segmented options={DIRS} value={dir} onChange={setDir} style={{ marginBottom: 6 }} />

              <SettingRow
                title="横屏大字（手持 90°）"
                desc="打开后自动横屏并把文字转 90°，关闭恢复竖屏自动旋转"
                right={<Toggle value={landscape} onChange={setLandscape} />}
              />

              <SectionTitle text="颜色" style={{ marginTop: 14 }} />
              <Text style={st.lab}>文字颜色</Text>
              <Swatches colors={TEXT_COLORS} value={color} onChange={setColor} />
              <Field value={hexIn} onChange={(v) => applyHex(v, 'text')} placeholder="自定义文字色 #RRGGBB" />

              <Text style={st.lab}>背景颜色</Text>
              <Swatches colors={BG_COLORS} value={bg} onChange={setBg} />
              <Field value={bgHexIn} onChange={(v) => applyHex(v, 'bg')} placeholder="自定义背景色 #RRGGBB" />
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * ColorOS 17 质感玻璃圆钮：SVG 竖向「上亮下暗」渐变底 + 1px 极细描边 + 顶部内高光线，
 * 按下走 Tap 的弹性缩放并给一次触感反馈。
 * 底色固定为深色玻璃，图标固定白色——因为它浮在用户自选背景色上，不能跟随主题。
 */
function GlassBtn(props: { icon: IconName; onPress: () => void; size?: number }) {
  const size = props.size ?? 44;
  const r = size / 2;
  const id = useMemo(() => `gb${(glassSeed += 1)}`, []);
  const hiW = size * 0.46;
  return (
    <Tap
      onPress={() => {
        nativeVibrate('0,12');
        props.onPress();
      }}
      style={[st.glassBtn, { width: size, height: size, borderRadius: r }]}
      scaleTo={0.9}
      hitSlop={6}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.26} />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size} rx={r} fill={`url(#${id})`} />
        </Svg>
        {/* 顶部内高光线 */}
        <View style={[st.glassHi, { top: 3, left: (size - hiW) / 2, width: hiW }]} />
      </View>
      <Icon name={props.icon} size={Math.round(size * 0.45)} color="#ffffff" strokeWidth={2} />
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
            {on ? (
              <Icon name="check" size={15} color={lum(c) > 0.62 ? '#111827' : '#ffffff'} strokeWidth={2.4} />
            ) : (
              <View />
            )}
          </Tap>
        );
      })}
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1, overflow: 'hidden' },
    layer: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    mover: { alignItems: 'flex-start' },
    big: { fontWeight: '900', includeFontPadding: false },
    measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },

    top: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center' },

    // 固定深色玻璃底（浮在用户自选背景上，不随主题变化）
    glassBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: GLASS_BASE,
      borderWidth: 1,
      borderColor: GLASS_BORDER,
    },
    glassHi: {
      position: 'absolute',
      height: 1.4,
      borderRadius: 1,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },

    // 主按钮：胶囊 + 蓝色渐变 + 细描边
    mainWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    mainBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.32)',
      shadowColor: C.primary,
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 6,
    },
    mainText: { color: '#ffffff', fontSize: 16.5, fontWeight: '800', letterSpacing: 1 },

    hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    hintPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 14,
      paddingRight: 4,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: GLASS_BASE,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    hintText: { color: 'rgba(255,255,255,0.92)', fontSize: 12.5 },

    // 底部抽屉
    sheetWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'flex-end',
      paddingHorizontal: 12,
    },
    scrim: { flex: 1, backgroundColor: 'rgba(8,10,14,0.42)' },
    sheet: {
      borderRadius: SHEET_R,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      // 半透明玻璃底：深色主题用深底 + 白色高光叠加，浅色主题用高不透明白，
      // 这样与面板内 ui 组件的取色始终配对，文字在任意弹幕背景上都可读
      backgroundColor: C.isDark ? 'rgba(18,22,30,0.88)' : 'rgba(255,255,255,0.93)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(17,24,39,0.10)',
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 14,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.line,
      marginBottom: 8,
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: C.text },
    sheetSub: { fontSize: 11.5, color: C.faint, marginTop: 2 },

    // 抽屉内的实时预览条
    previewBar: {
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.line,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 56,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 12,
    },
    previewTxt: { fontWeight: '900', includeFontPadding: false },

    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lab: { fontSize: 12.5, fontWeight: '600', color: C.sub, marginBottom: 6 },
    count: { fontSize: 11.5, color: C.faint },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.chip,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.chipBorder,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background, Card, Icon, Slider, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate, setImmersive, setKeepScreenOn } from '../native';
import type { IconName } from '../icons';

/** 番茄钟阶段 */
type Phase = 'idle' | 'work' | 'rest' | 'long';

const COUNT_KEY = 'toolbox.pomodoro.count';
const STROKE = 12;

const PHASE_LABEL: Record<Phase, string> = {
  idle: '准备开始',
  work: '专注中',
  rest: '休息中',
  long: '长休中',
};

/** 本地日期串，用于跨天归零 */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 毫秒 → mm:ss */
function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function Pomodoro({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // 设置项（分钟）
  const [workMin, setWorkMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [cycle, setCycle] = useState(4);

  // 运行态
  const [phase, setPhase] = useState<Phase>('idle');
  const [running, setRunning] = useState(false);
  const [remainMs, setRemainMs] = useState(25 * 60 * 1000);
  const [totalMs, setTotalMs] = useState(25 * 60 * 1000);
  const [count, setCount] = useState(0);
  const [showCfg, setShowCfg] = useState(false);

  // 目标结束时间戳：以它为基准计算剩余，避免 setInterval 漂移
  const endAt = useRef<number | null>(null);
  const cfgRef = useRef({ workMin, restMin, longMin, cycle });
  cfgRef.current = { workMin, restMin, longMin, cycle };
  const liveRef = useRef({ phase, count });
  liveRef.current = { phase, count };

  // 沉浸式 + 常亮，退出恢复
  useEffect(() => {
    setImmersive(true);
    setKeepScreenOn(true);
    return () => {
      setImmersive(false);
      setKeepScreenOn(false);
    };
  }, []);

  // 读取今日已完成番茄数（跨天归零）
  useEffect(() => {
    AsyncStorage.getItem(COUNT_KEY)
      .then((v) => {
        if (!v) return;
        const o = JSON.parse(v);
        if (o && o.date === todayKey()) setCount(Number(o.count) || 0);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((n: number) => {
    AsyncStorage.setItem(COUNT_KEY, JSON.stringify({ date: todayKey(), count: n })).catch(() => {});
  }, []);

  const durOf = (ph: Phase): number => {
    const c = cfgRef.current;
    if (ph === 'work') return c.workMin * 60000;
    if (ph === 'long') return c.longMin * 60000;
    return c.restMin * 60000;
  };

  const begin = useCallback((ph: Phase) => {
    const d = durOf(ph);
    endAt.current = Date.now() + d;
    setPhase(ph);
    setTotalMs(d);
    setRemainMs(d);
    setRunning(true);
  }, []);

  // 阶段结束：振动提示并自动切换（专注结束后累计番茄数）
  const next = useRef<() => void>(() => {});
  next.current = () => {
    nativeVibrate('0,400,200,400');
    const { phase: ph, count: ct } = liveRef.current;
    if (ph === 'work') {
      const n = ct + 1;
      setCount(n);
      persist(n);
      begin(n % cfgRef.current.cycle === 0 ? 'long' : 'rest');
    } else {
      begin('work');
    }
  };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const e = endAt.current;
      if (e == null) return;
      const ms = e - Date.now();
      if (ms <= 0) {
        endAt.current = null;
        next.current();
      } else {
        setRemainMs(ms);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  // 空闲时调整专注时长，倒计时同步刷新
  useEffect(() => {
    if (phase === 'idle') {
      const d = workMin * 60000;
      setTotalMs(d);
      setRemainMs(d);
    }
  }, [workMin, phase]);

  const toggleRun = () => {
    if (phase === 'idle') return;
    if (running) {
      const e = endAt.current;
      setRemainMs(e ? Math.max(0, e - Date.now()) : remainMs);
      endAt.current = null;
      setRunning(false);
    } else {
      endAt.current = Date.now() + remainMs;
      setRunning(true);
    }
  };

  const resetAction = () => {
    endAt.current = null;
    setRunning(false);
    setPhase('idle');
    const d = workMin * 60000;
    setTotalMs(d);
    setRemainMs(d);
  };

  // 跳过当前阶段（不累计番茄数）
  const skip = () => {
    const ph = liveRef.current.phase;
    if (ph === 'idle') return;
    begin(ph === 'work' ? 'rest' : 'work');
  };

  const ringSize = Math.max(200, Math.min(300, width - 76, height * 0.42));
  const cx = ringSize / 2;
  const r = (ringSize - STROKE) / 2 - 2;
  const circ = 2 * Math.PI * r;
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, 1 - remainMs / totalMs)) : 0;

  // 专注=暖橙红，休息=青绿，长休=主题蓝（均随主题深浅切换）
  const workColor = p.isDark ? '#ff8b5e' : '#e2582f';
  const accent =
    phase === 'work' ? workColor : phase === 'rest' ? p.ok : phase === 'long' ? p.info : workColor;

  const dots = Math.max(2, Math.min(8, cycle));
  const filled = count > 0 && count % cycle === 0 ? cycle : count % cycle;

  return (
    <View style={st.root}>
      <StatusBar hidden />
      <Background />

      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        <Tap onPress={onBack} style={st.iconBtn} hitSlop={12}>
          <Icon name="chevron" size={22} color={p.text} />
        </Tap>
        <Text style={st.topTitle}>番茄钟</Text>
        <Tap onPress={() => setShowCfg(true)} style={st.iconBtn} hitSlop={12}>
          <Icon name="sliders" size={20} color={p.text} />
        </Tap>
      </View>

      <View style={st.center}>
        <View style={st.dots}>
          {Array.from({ length: dots }).map((_, i) => (
            <View
              key={i}
              style={[
                st.dot,
                i < filled
                  ? { backgroundColor: accent, borderColor: accent }
                  : { backgroundColor: 'transparent', borderColor: p.line },
              ]}
            />
          ))}
        </View>

        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={ringSize} height={ringSize} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={accent} stopOpacity={p.isDark ? 0.24 : 0.15} />
                <Stop offset="0.72" stopColor={accent} stopOpacity={p.isDark ? 0.07 : 0.05} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cx} cy={cx} r={cx} fill="url(#halo)" />
            <Circle cx={cx} cy={cx} r={r} stroke={p.track} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={cx}
              cy={cx}
              r={r}
              stroke={accent}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ}`}
              strokeDashoffset={circ * (1 - ratio)}
              transform={`rotate(-90 ${cx} ${cx})`}
            />
          </Svg>
          <Text style={[st.time, { color: p.text, fontSize: Math.min(76, ringSize * 0.3) }]}>
            {fmt(remainMs)}
          </Text>
          <Text style={[st.phaseLabel, { color: accent }]}>{PHASE_LABEL[phase]}</Text>
          <Text style={[st.sub, { color: p.sub }]}>
            {count > 0 ? `今日第 ${count} 个番茄` : '保持节奏，专注当下'}
          </Text>
        </View>

        <View style={st.ctrl}>
          {phase === 'idle' ? (
            <>
              <CircleBtn icon="play" label="开始专注" color={workColor} primary onPress={() => begin('work')} />
              <CircleBtn icon="play" label="直接休息" color={p.ok} onPress={() => begin('rest')} />
            </>
          ) : (
            <>
              <CircleBtn icon="refresh" label="重置" color={p.text} onPress={resetAction} />
              <CircleBtn
                icon={running ? 'pause' : 'play'}
                label={running ? '暂停' : '继续'}
                color={accent}
                big
                primary
                onPress={toggleRun}
              />
              <CircleBtn icon="chevron" label="跳过" color={p.text} onPress={skip} />
            </>
          )}
        </View>
      </View>

      {showCfg ? (
        <View style={st.sheetWrap}>
          <Tap style={[StyleSheet.absoluteFill, { backgroundColor: p.overlay }]} onPress={() => setShowCfg(false)}>
            <View />
          </Tap>
          <Card style={[st.sheet, { marginBottom: insets.bottom + 10 }]} pad={16}>
            <View style={st.sheetHead}>
              <Text style={st.sheetTitle}>时长设置</Text>
              <Tap onPress={() => setShowCfg(false)} style={st.sheetClose} hitSlop={10}>
                <Icon name="close" size={18} color={p.sub} />
              </Tap>
            </View>
            <Slider
              label="专注时长"
              value={workMin}
              onChange={setWorkMin}
              min={5}
              max={90}
              step={1}
              format={(v) => `${v} 分钟`}
            />
            <Slider
              label="休息时长"
              value={restMin}
              onChange={setRestMin}
              min={1}
              max={30}
              step={1}
              format={(v) => `${v} 分钟`}
            />
            <Slider
              label="长休时长"
              value={longMin}
              onChange={setLongMin}
              min={5}
              max={45}
              step={1}
              format={(v) => `${v} 分钟`}
            />
            <Slider
              label="几个番茄后长休"
              value={cycle}
              onChange={setCycle}
              min={2}
              max={8}
              step={1}
              format={(v) => `${v} 个`}
              style={{ marginBottom: 0 }}
            />
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/** 玻璃质感圆形按钮（图标 + 文字标签） */
function CircleBtn(props: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  primary?: boolean;
  big?: boolean;
}) {
  const p = usePalette();
  const size = props.big ? 78 : 60;
  return (
    <Tap onPress={props.onPress} scaleTo={0.9} style={st.circleWrap}>
      <View
        style={[
          st.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: props.primary ? props.color : p.card,
            borderColor: props.primary ? 'transparent' : p.cardBorder,
          },
        ]}>
        <Icon name={props.icon} size={props.big ? 30 : 22} color={props.primary ? '#ffffff' : p.text} strokeWidth={2} />
      </View>
      <Text style={[st.circleLabel, { color: props.primary ? props.color : p.sub }]}>{props.label}</Text>
    </Tap>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
      letterSpacing: 1,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.cardBorder,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
    dots: { flexDirection: 'row', gap: 8, marginBottom: 18 },
    dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
    time: { fontWeight: '300', letterSpacing: 1, fontVariant: ['tabular-nums'] },
    phaseLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 3, marginTop: 4 },
    sub: { fontSize: 12.5, marginTop: 6 },
    ctrl: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 30 },
    circleWrap: { alignItems: 'center', gap: 8 },
    circle: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    circleLabel: { fontSize: 12, fontWeight: '600' },
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
    sheetTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
    sheetClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.chip,
    },
  }),
);

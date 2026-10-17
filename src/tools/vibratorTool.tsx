import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Btn,
  Card,
  Chip,
  GlassLayer,
  Icon,
  Page,
  SectionTitle,
  Segmented,
  Slider,
  Tap,
  Toggle,
  dynStyles,
} from '../ui';
import { usePalette } from '../theme';
import { cancelVibrate, nativeVibrate } from '../native';

/** 预设节奏：与自定义面板共用同一播放/停止引擎 */
const PRESETS: { label: string; desc: string; pattern: string }[] = [
  { label: '短震一下', desc: '嗒', pattern: '0,80' },
  { label: '长震', desc: '嗡——', pattern: '0,900' },
  { label: '双击', desc: '嗒-嗒', pattern: '0,80,120,80' },
  { label: '心跳', desc: '咚咚…咚咚', pattern: '0,120,100,120,600,120,100,120' },
  {
    label: '摩斯 SOS',
    desc: '···———···',
    pattern: '0,80,100,80,100,80,200,300,100,300,100,300,200,80,100,80,100,80',
  },
  { label: '波浪', desc: '渐强三连', pattern: '0,60,80,60,80,200,80,200,80,400' },
];

/** 把一次震动按强度档位细分成若干脉冲，近似改变手感（不改变总时长） */
function buildBurst(dur: number, level: number): number[] {
  const pulses = Math.max(1, Math.min(5, Math.round(level)));
  if (pulses <= 1) return [dur];
  const on = Math.max(15, Math.round(dur / pulses));
  const off = Math.max(10, Math.round((dur / pulses) * 0.35));
  const arr: number[] = [];
  for (let i = 0; i < pulses; i++) {
    arr.push(on);
    if (i < pulses - 1) arr.push(off);
  }
  return arr;
}

const burstMs = (b: number[]) => b.reduce((a, c) => a + c, 0);
/** 首项为等待时长，形如 0,dur,gap,dur,gap,... */
const cyclePattern = (b: number[]) => '0,' + b.join(',');
const sumPattern = (s: string) =>
  s
    .split(',')
    .map((x) => parseFloat(x))
    .filter((n) => isFinite(n))
    .reduce((a, c) => a + c, 0);

type Playing = { kind: 'custom' | 'preset'; key?: string } | null;

export default function VibratorTool({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [dur, setDur] = useState(240);
  const [gap, setGap] = useState(180);
  const [count, setCount] = useState(3);
  const [infinite, setInfinite] = useState(false);
  const [level, setLevel] = useState(3);
  const [playing, setPlaying] = useState<Playing>(null);
  const [done, setDone] = useState(0);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = useRef(false);
  const cfg = useRef({ dur, gap, count, infinite, level });
  cfg.current = { dur, gap, count, infinite, level };

  const stop = useCallback(() => {
    live.current = false;
    if (timer.current) {
      clearInterval(timer.current);
      clearTimeout(timer.current as any);
      timer.current = null;
    }
    cancelVibrate();
    setPlaying(null);
    setDone(0);
  }, []);

  useEffect(
    () => () => {
      live.current = false;
      if (timer.current) {
        clearInterval(timer.current);
        clearTimeout(timer.current as any);
      }
      cancelVibrate();
    },
    [],
  );

  const burst = useMemo(() => buildBurst(dur, level), [dur, level]);
  const cycle = useMemo(() => cyclePattern(burst), [burst]);

  /** 自定义节奏：JS 定时器逐拍下发，支持无限循环 */
  const startCustom = useCallback(() => {
    stop();
    const c = cfg.current;
    const b = buildBurst(c.dur, c.level);
    const period = Math.max(15, burstMs(b) + Math.max(0, c.gap));
    const one = cyclePattern(b);
    live.current = true;
    setPlaying({ kind: 'custom' });
    setDone(0);
    let n = 0;
    nativeVibrate(one);
    n = 1;
    setDone(1);
    if (!c.infinite && n >= c.count) {
      setTimeout(() => {
        if (live.current) stop();
      }, burstMs(b) + 60);
      return;
    }
    timer.current = setInterval(() => {
      if (!live.current) return;
      nativeVibrate(one);
      n += 1;
      setDone(n);
      if (!c.infinite && n >= c.count) stop();
    }, period);
  }, [stop]);

  /** 预设节奏：单次下发整段 waveform，按时长自动收尾 */
  const playPattern = useCallback(
    (pattern: string) => {
      stop();
      live.current = true;
      setPlaying({ kind: 'preset', key: pattern });
      nativeVibrate(pattern);
      timer.current = setTimeout(() => {
        if (live.current) stop();
      }, sumPattern(pattern) + 160);
    },
    [stop],
  );

  const toggleCustom = () => {
    if (playing?.kind === 'custom') stop();
    else startCustom();
  };

  const togglePreset = (pattern: string) => {
    if (playing?.kind === 'preset' && playing.key === pattern) stop();
    else playPattern(pattern);
  };

  const running = playing !== null;
  const custom = playing?.kind === 'custom';
  const remain = infinite ? Infinity : Math.max(0, count - done);

  /** 预览：把「完整一遍」压缩进一条固定长度的轨道，次数变了脉冲密度就会变 */
  const preview = useMemo(() => {
    const maxGroups = 16;
    const groups = Math.min(count, maxGroups);
    const items: { ms: number; on: boolean }[] = [];
    for (let c = 0; c < groups; c++) {
      burst.forEach((v, i) => items.push({ ms: v, on: i % 2 === 0 }));
      if (c < groups - 1) items.push({ ms: Math.max(1, gap), on: false });
    }
    const total = items.reduce((a, x) => a + x.ms, 0) || 1;
    return { items, total, hidden: count > maxGroups ? count - maxGroups : 0 };
  }, [burst, count, gap]);

  return (
    <Page id="vibrate" title="振动器" onBack={onBack}>
      <Card>
        <View style={st.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[st.stateTitle, { color: running ? p.primary : p.text }]}>
              {custom
                ? infinite
                  ? `无限循环中 · 第 ${done} 拍`
                  : `震动中 · ${done}/${count} 次`
                : playing?.kind === 'preset'
                ? '预设节奏播放中'
                : '准备就绪'}
            </Text>
            <Text style={[st.stateDesc, { color: p.sub }]}>
              {running
                ? custom
                  ? infinite
                    ? '点下面的按钮随时停下'
                    : `还剩约 ${remain} 次`
                  : '点下面的按钮可立即停下'
                : '单次时长与间隔都由你决定，也可以无限循环'}
            </Text>
          </View>
          <View
            style={[
              st.stateIcon,
              {
                backgroundColor: running ? p.primary : p.chip,
                borderColor: running ? 'transparent' : p.chipBorder,
              },
            ]}>
            <Icon name="bolt" size={19} color={running ? p.onPrimary : p.sub} />
          </View>
        </View>

        {custom && !infinite ? (
          <View style={[st.progressTrack, { backgroundColor: p.track }]}>
            <View
              style={[
                st.progressFill,
                {
                  width: `${Math.min(100, (done / Math.max(1, count)) * 100)}%`,
                  backgroundColor: p.primary,
                },
              ]}
            />
          </View>
        ) : null}

        <Tap
          onPress={toggleCustom}
          style={[
            st.bigBtn,
            {
              backgroundColor: custom ? p.warn : p.primary,
              marginTop: 14,
            },
          ]}>
          <GlassLayer radius={999} tone={custom ? 'danger' : 'primary'} />
          <Icon name={custom ? 'close' : 'play'} size={19} color={custom ? p.warn : p.onPrimary} />
          <Text style={[st.bigBtnText, { color: custom ? p.warn : p.onPrimary }]}>
            {custom ? '停止震动' : '开始震动'}
          </Text>
        </Tap>
      </Card>

      <Card>
        <SectionTitle text="自定义节奏" style={{ marginTop: 0 }} />
        <Slider
          label="单次时长"
          value={dur}
          min={20}
          max={3000}
          step={10}
          onChange={setDur}
          format={(v) => `${Math.round(v)} ms`}
        />
        <Slider
          label="间隔"
          value={gap}
          min={0}
          max={2000}
          step={10}
          onChange={setGap}
          format={(v) => `${Math.round(v)} ms`}
        />
        <Slider
          label="重复次数"
          value={count}
          min={1}
          max={99}
          step={1}
          onChange={setCount}
          format={(v) => `${Math.round(v)} 次`}
        />

        <View style={[st.rowBetween, { marginTop: 2 }]}>
          <Text style={[st.label, { color: p.text }]}>强度档位</Text>
          <Text style={[st.value, { color: p.primary }]}>{level} / 5</Text>
        </View>
        <Segmented
          options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
          value={level}
          onChange={setLevel}
        />

        <View style={[st.rowBetween, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[st.label, { color: p.text, marginBottom: 0 }]}>无限循环</Text>
            <Text style={[st.note, { color: p.faint, marginTop: 2 }]}>
              一直震到你按停止为止
            </Text>
          </View>
          <Toggle value={infinite} onChange={setInfinite} />
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={[st.rowBetween, { marginBottom: 7 }]}>
            <Text style={[st.label, { color: p.text, marginBottom: 0 }]}>节奏预览</Text>
            <Text style={[st.value, { color: p.primary }]}>
              {infinite ? `1 拍 ${burstMs(burst)}ms · 循环` : `${count} 次 · 共 ${(burstMs(burst) + gap) * count - gap}ms`}
            </Text>
          </View>
          <View style={[st.track, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            {preview.items.map((it, i) => (
              <View
                key={i}
                style={{
                  flex: it.ms / preview.total,
                  height: '100%',
                  backgroundColor: it.on ? p.primary : 'transparent',
                }}
              />
            ))}
          </View>
          <Text style={[st.note, { color: p.faint }]}>
            {preview.hidden > 0
              ? `条带只画前 ${count - preview.hidden} 次，后面还有 ${preview.hidden} 次同样的节奏`
              : '条带长度固定，脉冲越密表示同一段时间里震得越多次'}
          </Text>
        </View>
      </Card>

      <SectionTitle text="预设节奏" right={<Text style={[st.note, { color: p.faint, marginTop: 0 }]}>点一下开始，再点一下停止</Text>} />
      {PRESETS.map((x) => {
        const on = playing?.kind === 'preset' && playing.key === x.pattern;
        return (
          <Card key={x.label} pad={12} style={{ marginBottom: 9 }}>
            <Tap onPress={() => togglePreset(x.pattern)} style={st.presetRow}>
              <View
                style={[
                  st.presetIcon,
                  { backgroundColor: on ? p.primary : p.chip, borderColor: on ? 'transparent' : p.chipBorder },
                ]}>
                <Icon name={on ? 'pause' : 'play'} size={15} color={on ? p.onPrimary : p.sub} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.name, { color: p.text }]}>{x.label}</Text>
                <Text style={[st.desc, { color: p.sub }]}>{x.desc}</Text>
              </View>
              <Text style={[st.presetState, { color: on ? p.primary : p.faint }]}>
                {on ? '停止' : '震动'}
              </Text>
            </Tap>
          </Card>
        );
      })}

      <Card>
        <Text style={[st.note, { color: p.sub, marginTop: 0 }]}>
          强度档位通过把一次长震拆成多段短脉冲来近似改变手感，总时长不变；部分机型的马达是转子马达，
          低频震感偏弱属正常现象。
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Chip text="停止一切震动" icon="close" onPress={stop} />
          <Chip text="360ms 常震" icon="bolt" onPress={() => playPattern('0,360')} />
        </View>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stateTitle: { fontSize: 16, fontWeight: '700' },
    stateDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
    stateIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
    progressFill: { height: 6, borderRadius: 3 },
    bigBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: 999,
      overflow: 'hidden',
    },
    bigBtnText: { fontSize: 15.5, fontWeight: '700' },
    label: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
    value: { fontSize: 12.5, fontWeight: '700' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    note: { fontSize: 11.5, lineHeight: 17, marginTop: 6 },
    track: {
      flexDirection: 'row',
      height: 26,
      borderRadius: 9,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
    },
    presetRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    presetIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    presetState: { fontSize: 12.5, fontWeight: '700' },
    name: { fontSize: 14.5, fontWeight: '600' },
    desc: { fontSize: 12, marginTop: 2 },
  }),
);

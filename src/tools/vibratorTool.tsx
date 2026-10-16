import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Btn,
  Card,
  dynStyles,
  Icon,
  Page,
  SectionTitle,
  Segmented,
  Slider,
  Tap,
  Toggle,
} from '../ui';
import { usePalette } from '../theme';
import { cancelVibrate, copyText, nativeVibrate } from '../native';

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

export default function VibratorTool({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [dur, setDur] = useState(240);
  const [gap, setGap] = useState(180);
  const [count, setCount] = useState(3);
  const [infinite, setInfinite] = useState(false);
  const [level, setLevel] = useState(3);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [presetKey, setPresetKey] = useState('');
  const [copied, setCopied] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = useRef(false);
  const cfg = useRef({ dur, gap, count, infinite, level });
  cfg.current = { dur, gap, count, infinite, level };

  /** 统一下沉引擎：清定时器 + 取消原生震动 + 复位状态 */
  const stop = useCallback(() => {
    live.current = false;
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    cancelVibrate();
    setRunning(false);
    setDone(0);
    setPresetKey('');
  }, []);

  /* 组件卸载时务必停掉循环并取消震动 */
  useEffect(
    () => () => {
      live.current = false;
      if (timer.current) clearInterval(timer.current);
      cancelVibrate();
    },
    [],
  );

  const burst = useMemo(() => buildBurst(dur, level), [dur, level]);
  const cycle = useMemo(() => cyclePattern(burst), [burst]);

  const patternText = useMemo(() => {
    if (presetKey) return presetKey;
    if (infinite) return `${cycle}   (无限循环 · 间隔 ${gap}ms)`;
    const seq: number[] = [0];
    for (let c = 0; c < count; c++) {
      burst.forEach((v) => seq.push(v));
      if (c < count - 1) seq.push(gap);
    }
    return seq.join(',');
  }, [presetKey, infinite, cycle, gap, count, burst]);

  /** 自定义节奏：用 JS setInterval 周期调用 nativeVibrate 实现「无限循环」 */
  const startCustom = useCallback(() => {
    stop();
    const c = cfg.current;
    const b = buildBurst(c.dur, c.level);
    const period = Math.max(15, burstMs(b) + Math.max(0, c.gap));
    const one = cyclePattern(b);
    live.current = true;
    setRunning(true);
    setDone(0);
    setPresetKey('');
    let n = 0;
    // 首拍立即触发，之后按「单次时长 + 间隔」周期循环
    nativeVibrate(one);
    n = 1;
    setDone(1);
    if (!c.infinite && n >= c.count) {
      stop();
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
      setRunning(true);
      setPresetKey(pattern);
      nativeVibrate(pattern);
      timer.current = setTimeout(() => stop(), sumPattern(pattern) + 160);
    },
    [stop],
  );

  const remaining = infinite ? Infinity : Math.max(0, count - done);
  const progress = infinite ? 0 : count > 0 ? Math.min(1, done / count) : 0;
  const stopText = running
    ? presetKey
      ? '停止震动'
      : infinite
      ? `停止震动 · 已震 ${done} 次`
      : `停止震动 · 剩余 ${remaining} 次`
    : '停止震动';

  return (
    <Page id="vibrate" title="振动器" onBack={onBack}>
      <Card>
        <Text style={st.tip}>
          按「秒」级节奏驱动马达：可设定单次时长、间隔与次数，也可无限循环。强度由系统马达决定，本页控制的是节奏；部分机型为转子马达，振动偏弱属正常现象。
        </Text>
        <View style={{ marginTop: 12 }}>
          <Btn
            text={stopText}
            kind="danger"
            icon="close"
            onPress={stop}
            style={{ paddingVertical: 15 }}
          />
        </View>
        {running && !presetKey ? (
          <View style={{ marginTop: 12 }}>
            <View style={[st.track, { backgroundColor: p.track }]}>
              <View
                style={[
                  st.fill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: p.primary,
                  },
                ]}
              />
            </View>
            <Text style={st.progressTxt}>
              {infinite ? `已循环 ${done} 次（无限模式）` : `进度 ${done}/${count} 次`}
            </Text>
          </View>
        ) : null}
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

        <View style={st.rowBetween}>
          <Text style={st.label}>强度档位（1 最轻 · 5 最强）</Text>
          <Text style={st.value}>{level}</Text>
        </View>
        <Segmented
          options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
          value={level}
          onChange={setLevel}
        />
        <Text style={st.note}>
          Android 无振幅接口时，档位通过把单次震动细分为多段脉冲来近似改变手感，总时长不变。
        </Text>

        <View style={[st.rowBetween, { marginTop: 12 }]}>
          <Text style={st.label}>无限循环</Text>
          <Toggle value={infinite} onChange={setInfinite} />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={st.label}>一个周期的节奏预览</Text>
          <View style={st.prevRow}>
            {burst.map((v, i) => (
              <View
                key={i}
                style={{
                  width: Math.max(3, Math.min(90, v / 16)),
                  height: 12,
                  borderRadius: 6,
                  marginRight: 3,
                  backgroundColor: i % 2 === 0 ? p.primary : p.track,
                }}
              />
            ))}
            {gap > 0 ? (
              <View
                style={{
                  width: Math.max(3, Math.min(90, gap / 16)),
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: p.line,
                }}
              />
            ) : null}
          </View>
        </View>

        <View style={st.codeBox}>
          <Text selectable style={st.code}>
            {patternText}
          </Text>
          <Tap
            onPress={() => {
              copyText(patternText);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            style={st.copyBtn}>
            <Icon name={copied ? 'check' : 'copy'} size={16} color={copied ? p.ok : p.faint} />
          </Tap>
        </View>

        <View style={{ marginTop: 12 }}>
          <Btn text="开始震动" icon="play" onPress={startCustom} />
        </View>
      </Card>

      <SectionTitle text="预设节奏" />
      {PRESETS.map((x) => {
        const on = presetKey === x.pattern;
        return (
          <Card key={x.label} pad={13} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{x.label}</Text>
                <Text style={st.desc}>{x.desc}</Text>
              </View>
              <Btn
                text={on ? '震动中' : '震动'}
                size="sm"
                fit
                icon="play"
                kind={on ? 'primary' : 'soft'}
                onPress={() => playPattern(x.pattern)}
              />
            </View>
          </Card>
        );
      })}
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    tip: { fontSize: 12.5, lineHeight: 19, color: C.sub },
    label: { fontSize: 12.5, fontWeight: '600', marginBottom: 6, color: C.text },
    value: { fontSize: 12.5, fontWeight: '700', color: C.primary },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    note: { fontSize: 11.5, lineHeight: 17, marginTop: 8, color: C.faint },
    prevRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 0, marginTop: 2 },
    codeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.line,
      backgroundColor: C.input,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    code: { flex: 1, fontSize: 12, lineHeight: 18, color: C.sub },
    copyBtn: { padding: 4 },
    track: { height: 8, borderRadius: 4, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4 },
    progressTxt: { fontSize: 12, marginTop: 6, color: C.sub },
    name: { fontSize: 15, fontWeight: '600', color: C.text },
    desc: { fontSize: 12, marginTop: 2, color: C.sub },
  }),
);

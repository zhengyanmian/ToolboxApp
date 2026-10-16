import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Card, Icon, Page, SectionTitle, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate } from '../native';

type State = 'idle' | 'waiting' | 'go' | 'early' | 'done';

const KEY = 'reaction.records';

/** 成绩评级 */
function rate(ms: number): string {
  if (ms < 180) return '顶尖';
  if (ms < 230) return '优秀';
  if (ms < 300) return '良好';
  return '继续练习';
}

function rateColor(ms: number, C: { ok: string; primary: string; warn: string; sub: string }): string {
  if (ms < 180) return C.ok;
  if (ms < 230) return C.primary;
  if (ms < 300) return C.primary;
  return C.sub;
}

export default function ReactionTest({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [state, setState] = useState<State>('idle');
  const [ms, setMs] = useState(0);
  const [records, setRecords] = useState<number[]>([]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greenAt = useRef(0);
  const armed = useRef(false); // 本轮是否由本次按压发起，避免多点触控误记成绩
  const phase = useRef(new Animated.Value(0)).current; // 0 待机 1 等待 2 变绿 3 抢跑 4 成绩
  const pop = useRef(new Animated.Value(1)).current;

  // 读取历史成绩
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!v) return;
        try {
          const a = JSON.parse(v);
          if (Array.isArray(a)) setRecords(a.filter((n) => typeof n === 'number').slice(0, 10));
        } catch {}
      })
      .catch(() => {});
  }, []);

  // 释放定时器
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const phaseIdx = state === 'idle' ? 0 : state === 'waiting' ? 1 : state === 'go' ? 2 : state === 'early' ? 3 : 4;

  // 背景柔和过渡
  useEffect(() => {
    Animated.timing(phase, { toValue: phaseIdx, duration: 220, useNativeDriver: false }).start();
  }, [phaseIdx, phase]);

  // 变绿瞬间的弹性放大
  useEffect(() => {
    if (state !== 'go') return;
    pop.setValue(1);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
  }, [state, pop]);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const startRound = () => {
    clearTimer();
    armed.current = true;
    setState('waiting');
    const delay = 1200 + Math.random() * 2800;
    timer.current = setTimeout(() => {
      greenAt.current = Date.now();
      setState('go');
      nativeVibrate('0,45'); // 变绿瞬间一次轻震
    }, delay);
  };

  // 按住：开始等待
  const onPressIn = () => {
    if (state === 'waiting' || state === 'go') return;
    startRound();
  };

  // 抬手：等待中抬手=抢跑；变绿后抬手=记录成绩
  const onPressOut = () => {
    if (!armed.current) return;
    armed.current = false;
    if (state === 'waiting') {
      clearTimer();
      setState('early');
      return;
    }
    if (state === 'go') {
      const d = Math.max(0, Date.now() - greenAt.current);
      setMs(d);
      setRecords((r) => {
        const next = [d, ...r].slice(0, 10);
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setState('done');
    }
  };

  const idleBg = p.isDark ? '#151b26' : '#1e293b';
  const waitBg = p.isDark ? '#7f1d1d' : '#dc2626';
  const goBg = p.ok;
  const earlyBg = '#f59e0b';
  const doneBg = p.cardSolid;

  const bgAnim = phase.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [idleBg, waitBg, goBg, earlyBg, doneBg],
    extrapolate: 'clamp',
  });

  const fg =
    state === 'done'
      ? p.text
      : state === 'go'
      ? p.isDark
        ? '#062e1c'
        : '#ffffff'
      : state === 'early'
      ? '#3b2a06'
      : '#ffffff';

  const label =
    state === 'idle'
      ? '按住屏幕开始'
      : state === 'waiting'
      ? '按住别松手，等变绿'
      : state === 'go'
      ? '抬手！'
      : state === 'early'
      ? '抢跑啦！'
      : '';

  const best = records.length ? Math.min(...records) : null;
  const last5 = records.slice(0, 5);
  const avg = last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) : null;

  return (
    <Page id="reaction" title="反应力测试" onBack={onBack}>
      <Animated.View style={[st.area, { backgroundColor: bgAnim, transform: [{ scale: pop }] }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          android_disableSound
        />
        <View pointerEvents="none" style={st.center}>
          {state === 'done' ? (
            <>
              <Text style={[st.score, { color: fg }]}>
                {ms}
                <Text style={st.scoreUnit}> ms</Text>
              </Text>
              <Text style={[st.small, { color: fg, opacity: 0.82 }]}>
                评级：{rate(ms)} · 再来一次
              </Text>
            </>
          ) : (
            <>
              <Text style={[st.big, { color: fg, fontSize: state === 'go' ? 36 : 23 }]}>{label}</Text>
              {state === 'idle' ? (
                <Text style={[st.small, { color: fg, opacity: 0.72 }]}>按住不放，变绿后立刻抬手</Text>
              ) : null}
              {state === 'waiting' ? (
                <Text style={[st.small, { color: fg, opacity: 0.85 }]}>别抢跑，等它变绿</Text>
              ) : null}
              {state === 'early' ? (
                <Text style={[st.small, { color: fg, opacity: 0.9 }]}>按住别松手，变绿后再抬手</Text>
              ) : null}
            </>
          )}
        </View>
      </Animated.View>

      <Card style={{ marginTop: 12 }}>
        <SectionTitle text="本次统计" style={{ marginTop: 0 }} />
        <View style={st.metrics}>
          <Metric label="最佳" value={best != null ? String(best) : '--'} unit="ms" color={p.ok} />
          <Metric label="近 5 次均值" value={avg != null ? String(avg) : '--'} unit="ms" color={p.primary} />
          <Metric
            label="最近评级"
            value={records.length ? rate(records[0]) : '--'}
            unit=""
            color={records.length ? rateColor(records[0], p) : p.sub}
          />
        </View>

        <View style={st.recHead}>
          <Text style={{ fontSize: 12.5, color: p.sub, fontWeight: '600' }}>历史记录（最近 10 次）</Text>
          {records.length ? (
            <Btn
              text="清空"
              kind="ghost"
              size="sm"
              fit
              icon="trash"
              onPress={() => {
                setRecords([]);
                AsyncStorage.removeItem(KEY).catch(() => {});
              }}
            />
          ) : null}
        </View>
        {records.length ? (
          <View style={st.recWrap}>
            {records.map((r, i) => (
              <View
                key={`${i}-${r}`}
                style={[
                  st.recChip,
                  { backgroundColor: i === 0 ? p.primarySoft : p.chip, borderColor: i === 0 ? p.primary + '55' : p.chipBorder },
                ]}>
                <Text style={{ fontSize: 12.5, fontWeight: i === 0 ? '800' : '600', color: i === 0 ? p.primary : p.sub }}>
                  {r}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 12.5, color: p.faint, marginTop: 6 }}>还没有记录，先来测一次吧</Text>
        )}

        <View style={[st.tipRow, { borderTopColor: p.line }]}>
          <Icon name="touch" size={15} color={p.sub} />
          <Text style={[st.tip, { color: p.sub }]}>
            玩法：按住屏幕别松手 → 屏幕变绿的一瞬间立刻抬手。等待中提前抬手算抢跑。人的平均视觉反应约 200~300 毫秒。
          </Text>
        </View>
      </Card>
    </Page>
  );
}

function Metric(props: { label: string; value: string; unit: string; color: string }) {
  const p = usePalette();
  return (
    <View style={[st.metric, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
      <Text style={{ fontSize: 11.5, color: p.sub }}>{props.label}</Text>
      <Text style={{ fontSize: 19, fontWeight: '800', color: props.color, fontVariant: ['tabular-nums'], marginTop: 2 }}>
        {props.value}
        {props.unit ? <Text style={{ fontSize: 11, fontWeight: '600' }}> {props.unit}</Text> : null}
      </Text>
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    area: {
      height: 300,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    center: { alignItems: 'center', paddingHorizontal: 20 },
    big: { fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
    small: { fontSize: 13, marginTop: 10, textAlign: 'center' },
    score: { fontSize: 46, fontWeight: '800', fontVariant: ['tabular-nums'] },
    scoreUnit: { fontSize: 16, fontWeight: '600' },
    metrics: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metric: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
    },
    recHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    recWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    tipRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tip: { fontSize: 12, lineHeight: 18, flex: 1 },
  }),
);

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Icon, Page, SectionTitle, dynStyles } from '../ui';
import { usePalette } from '../theme';

type Dot = { id: string; x: number; y: number };

const DOT_SIZE = 52;
const HALF = DOT_SIZE / 2;

export default function FingerRoulette({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [dots, setDots] = useState<Dot[]>([]);
  const [lit, setLit] = useState<string | null>(null); // 轮播高亮
  const [winner, setWinner] = useState<string | null>(null); // 最终中奖
  const [rolling, setRolling] = useState(false);
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState('');

  const dotsRef = useRef<Dot[]>([]);
  const lastFp = useRef(''); // 上一次触摸指纹，用于去抖
  const roll = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  // 卸载时清掉所有定时器
  useEffect(
    () => () => {
      if (roll.current) clearInterval(roll.current);
      if (unlock.current) clearTimeout(unlock.current);
    },
    [],
  );

  /** 把原生 touches 同步成点集；仅在指纹变化（手指数或位置 >1px）时才 setState */
  const sync = (touches: readonly any[]) => {
    const list: Dot[] = [];
    for (let i = 0; i < touches.length; i++) {
      const t: any = touches[i];
      const id = t.identifier != null ? String(t.identifier) : `idx${i}`;
      const x = typeof t.locationX === 'number' ? t.locationX : t.pageX ?? 0;
      const y = typeof t.locationY === 'number' ? t.locationY : t.pageY ?? 0;
      list.push({ id, x, y });
    }
    const fp = list.map((d) => `${d.id}:${Math.round(d.x)},${Math.round(d.y)}`).join('|');
    if (fp === lastFp.current) return;
    lastFp.current = fp;

    // 手指数变化 → 之前的中奖/高亮作废
    if (list.length !== dotsRef.current.length) {
      setLit(null);
      setWinner(null);
    }
    dotsRef.current = list;
    setDots(list);
  };

  const reset = () => {
    if (roll.current) {
      clearInterval(roll.current);
      roll.current = null;
    }
    if (unlock.current) {
      clearTimeout(unlock.current);
      unlock.current = null;
    }
    lastFp.current = '';
    dotsRef.current = [];
    setDots([]);
    setLit(null);
    setWinner(null);
    setRolling(false);
  };

  const warn = () => {
    setHint('至少需要 2 根手指');
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setHint(''), 1700);
  };

  /** 开抽：先在按住的手指间依次高亮轮播，再定格中奖点 */
  const start = () => {
    if (rolling) return;
    const list = dotsRef.current;
    if (list.length < 2) {
      warn();
      return;
    }
    setHint('');
    setWinner(null);
    setRolling(true);

    const ids = list.map((d) => d.id);
    const total = 1000 + Math.random() * 400; // 1.0 ~ 1.4 秒
    const t0 = Date.now();
    let i = 0;

    roll.current = setInterval(() => {
      setLit(ids[i % ids.length]);
      i++;
      if (Date.now() - t0 >= total) {
        if (roll.current) clearInterval(roll.current);
        roll.current = null;
        const win = ids[Math.floor(Math.random() * ids.length)];
        setLit(null);
        setWinner(win);
        setCount((c) => c + 1);
        // 定格 1.2 秒后可再次开抽（手指数不变时）
        unlock.current = setTimeout(() => {
          setRolling(false);
          unlock.current = null;
        }, 1200);
      }
    }, 90);
  };

  return (
    <Page id="finger" title="指尖转" onBack={onBack}>
      <Card>
        <SectionTitle text="玩法" style={{ marginTop: 0 }} />
        <Text style={[st.tip, { color: p.sub }]}>
          所有人各按住一根手指不放，然后点「开抽」——系统会先在手指间快速轮播，最后定格一位幸运儿。松手即重置。
        </Text>
        <View style={st.statRow}>
          <View style={[st.stat, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            <Icon name="touch" size={14} color={p.primary} />
            <Text style={[st.statText, { color: p.text }]}>
              按住 <Text style={{ color: p.primary, fontWeight: '800' }}>{dots.length}</Text> 根
            </Text>
          </View>
          <View style={[st.stat, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            <Icon name="wheel" size={14} color={p.primary} />
            <Text style={[st.statText, { color: p.text }]}>
              已抽 <Text style={{ color: p.primary, fontWeight: '800' }}>{count}</Text> 次
            </Text>
          </View>
        </View>

        <Btn
          text={rolling ? '开抽中…' : '开抽！'}
          icon="wheel"
          onPress={start}
          disabled={rolling}
          style={{ marginTop: 12 }}
        />

        {hint ? (
          <Animated.View
            style={[
              st.hintWrap,
              { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }) }] },
            ]}>
            <Icon name="info" size={14} color={p.warn} />
            <Text style={[st.hintText, { color: p.warn }]}>{hint}</Text>
          </Animated.View>
        ) : null}
      </Card>

      <View
        style={[st.area, { backgroundColor: p.card, borderColor: p.cardBorder }]}
        onTouchStart={(e) => sync(e.nativeEvent.touches)}
        onTouchMove={(e) => sync(e.nativeEvent.touches)}
        onTouchEnd={(e) => {
          const t = e.nativeEvent.touches;
          if (t.length === 0) reset();
          else sync(t);
        }}
        onTouchCancel={reset}>
        {dots.length === 0 ? (
          <View pointerEvents="none" style={st.emptyWrap}>
            <Icon name="touch" size={30} color={p.faint} />
            <Text style={[st.empty, { color: p.sub }]}>手指按在这里</Text>
            <Text style={[st.emptySub, { color: p.faint }]}>每根手指按住一个位置，再点「开抽」</Text>
          </View>
        ) : null}

        {winner ? (
          <View pointerEvents="none" style={[st.banner, { backgroundColor: p.ok + '22', borderColor: p.ok + '55' }]}>
            <Icon name="trophy" size={16} color={p.ok} />
            <Text style={[st.bannerText, { color: p.ok }]}>中奖啦！</Text>
          </View>
        ) : null}

        {dots.map((d) => (
          <DotView
            key={d.id}
            x={d.x}
            y={d.y}
            lit={lit === d.id}
            winner={winner === d.id}
            dim={winner != null && winner !== d.id}
          />
        ))}
      </View>
    </Page>
  );
}

/** 单个圆点：外层负责定位（transform: translate），内层负责慢速脉冲与中奖放大 */
function DotView(props: { x: number; y: number; lit: boolean; winner: boolean; dim: boolean }) {
  const p = usePalette();
  const pulse = useRef(new Animated.Value(0)).current;
  const litV = useRef(new Animated.Value(0)).current;
  const winV = useRef(new Animated.Value(0)).current;
  const dimV = useRef(new Animated.Value(1)).current;

  // 慢速脉冲（呼吸感，1.0↔1.06，周期 1.4s），只启动一次，避免反复重启
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.timing(litV, { toValue: props.lit ? 1 : 0, duration: 110, useNativeDriver: true }).start();
  }, [props.lit, litV]);

  useEffect(() => {
    Animated.spring(winV, { toValue: props.winner ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
  }, [props.winner, winV]);

  useEffect(() => {
    Animated.timing(dimV, { toValue: props.dim ? 0.3 : 1, duration: 200, useNativeDriver: true }).start();
  }, [props.dim, dimV]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const litScale = litV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const winScale = winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const scale = Animated.multiply(Animated.multiply(pulseScale, litScale), winScale);

  const bg = props.winner ? p.ok : props.lit ? p.primary : p.primarySoft;
  const border = props.winner ? p.ok : props.lit ? p.primary : p.primary + '66';
  const fg = props.winner ? (p.isDark ? '#04240f' : '#ffffff') : props.lit ? p.onPrimary : p.primary;

  return (
    <View
      pointerEvents="none"
      style={[st.dotWrap, { transform: [{ translateX: props.x - HALF }, { translateY: props.y - HALF }] }]}>
      {props.winner ? (
        <Animated.View
          style={[
            st.halo,
            {
              borderColor: p.ok,
              opacity: winV.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
              transform: [{ scale: winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          st.dot,
          { backgroundColor: bg, borderColor: border, transform: [{ scale }], opacity: dimV },
        ]}>
        {props.winner ? <Text style={[st.dotText, { color: fg }]}>中啦</Text> : null}
      </Animated.View>
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    tip: { fontSize: 12.5, lineHeight: 19 },
    statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    statText: { fontSize: 13 },
    hintWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    hintText: { fontSize: 12.5, fontWeight: '600' },
    area: {
      height: 360,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: C.cardShadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    emptyWrap: { alignItems: 'center', gap: 8 },
    empty: { fontSize: 15, fontWeight: '600' },
    emptySub: { fontSize: 12 },
    banner: {
      position: 'absolute',
      top: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    bannerText: { fontSize: 13, fontWeight: '800' },
    dotWrap: { position: 'absolute', left: 0, top: 0, width: DOT_SIZE, height: DOT_SIZE },
    halo: { position: 'absolute', left: 0, top: 0, width: DOT_SIZE, height: DOT_SIZE, borderRadius: HALF, borderWidth: 2 },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: HALF,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotText: { fontSize: 13, fontWeight: '800' },
  }),
);

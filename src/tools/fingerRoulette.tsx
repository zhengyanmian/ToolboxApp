import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Btn, Card, Icon, Page, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate } from '../native';

type Dot = { id: string; x: number; y: number };

const DOT_SIZE = 56;
const HALF = DOT_SIZE / 2;
/** 手指全部离开后，位置最多保留这么久，期间点「开抽」仍可用 */
const SNAP_TTL = 10000;

export default function FingerRoulette({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [dots, setDots] = useState<Dot[]>([]);
  const [lit, setLit] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState('');
  const [locked, setLocked] = useState(false); // 手指已离开但位置仍被保留

  const liveRef = useRef<Dot[]>([]);
  const snapRef = useRef<{ dots: Dot[]; at: number }>({ dots: [], at: 0 });
  const lastFp = useRef('');
  const roll = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(
    () => () => {
      if (roll.current) clearInterval(roll.current);
      if (unlock.current) clearTimeout(unlock.current);
    },
    [],
  );

  /** 把原生 touches 同步成点集 */
  const apply = (list: Dot[], keepOnEmpty: boolean) => {
    const fp = list.map((d) => `${d.id}:${Math.round(d.x)},${Math.round(d.y)}`).join('|');
    if (fp === lastFp.current && list.length > 0) return;
    lastFp.current = fp;

    if (list.length !== liveRef.current.length) {
      setLit(null);
      setWinner(null);
    }
    liveRef.current = list;
    if (list.length >= 2) snapRef.current = { dots: list, at: Date.now() };

    // 手指离开（或被系统 cancel）时保留最近一次有效位置，否则「开抽」会取不到手指
    if (list.length === 0 && keepOnEmpty) {
      const s = snapRef.current;
      if (s.dots.length >= 2 && Date.now() - s.at < SNAP_TTL) {
        setDots(s.dots);
        setLocked(true);
        return;
      }
    }
    setDots(list);
    setLocked(false);
  };

  const sync = (touches: readonly any[], keepOnEmpty = false) => {
    const list: Dot[] = [];
    for (let i = 0; i < touches.length; i++) {
      const t: any = touches[i];
      const id = t.identifier != null ? String(t.identifier) : `idx${i}`;
      const x = typeof t.locationX === 'number' ? t.locationX : t.pageX ?? 0;
      const y = typeof t.locationY === 'number' ? t.locationY : t.pageY ?? 0;
      list.push({ id, x, y });
    }
    apply(list, keepOnEmpty);
  };

  const hardReset = () => {
    if (roll.current) {
      clearInterval(roll.current);
      roll.current = null;
    }
    if (unlock.current) {
      clearTimeout(unlock.current);
      unlock.current = null;
    }
    lastFp.current = '';
    liveRef.current = [];
    snapRef.current = { dots: [], at: 0 };
    setDots([]);
    setLit(null);
    setWinner(null);
    setRolling(false);
    setLocked(false);
    setHint('');
  };

  const warn = (msg: string) => {
    setHint(msg);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    nativeVibrate('0,30');
    setTimeout(() => setHint(''), 2000);
  };

  const currentDots = () => {
    if (liveRef.current.length >= 2) return liveRef.current;
    const s = snapRef.current;
    if (s.dots.length >= 2 && Date.now() - s.at < SNAP_TTL) return s.dots;
    return [];
  };

  const start = () => {
    if (rolling) return;
    const list = currentDots();
    if (list.length < 2) {
      warn('至少要有 2 根手指按住（松手后 10 秒内也能抽）');
      return;
    }
    if (list !== liveRef.current) {
      // 用保留的位置开抽，先把圆点补画出来
      setDots(list);
      setLocked(true);
    }
    setHint('');
    setWinner(null);
    setRolling(true);
    nativeVibrate('0,16');

    const ids = list.map((d) => d.id);
    const total = 1000 + Math.random() * 400;
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
        nativeVibrate('0,40,70,40');
        unlock.current = setTimeout(() => {
          setRolling(false);
          unlock.current = null;
        }, 1400);
      }
    }, 90);
  };

  const need = dots.length < 2;
  const canDraw = !rolling && !need;

  return (
    <Page id="finger" title="指尖转" onBack={onBack} scroll={false} contentStyle={{ paddingBottom: 14 }}>
      <Card style={{ marginBottom: 12 }}>
        <View style={st.head}>
          <View style={{ flex: 1 }}>
            <Text style={[st.title, { color: p.text }]}>按住手指，再点开抽</Text>
            <Text style={[st.tip, { color: p.sub }]}>
              每人一根手指按住下面区域不要松手，点「开抽」后会在手指之间快速轮播，最后定格一位。松手后位置会保留
              10 秒，期间也能开抽。
            </Text>
          </View>
          <View style={[st.countPill, { backgroundColor: p.primarySoft, borderColor: p.primary + '44' }]}>
            <Text style={[st.countNum, { color: p.primary }]}>{dots.length}</Text>
            <Text style={[st.countLbl, { color: p.primary }]}>指</Text>
          </View>
        </View>

        <Btn
          text={rolling ? '开抽中…' : need ? '先按住 2 根以上手指' : '开抽！'}
          icon="wheel"
          onPress={start}
          disabled={rolling}
          style={{ marginTop: 12, opacity: canDraw || rolling ? 1 : 0.6 }}
        />

        <Text style={[st.sub, { color: p.faint }]}>已抽 {count} 次</Text>

        {hint ? (
          <Animated.View
            style={[
              st.hintWrap,
              { backgroundColor: p.warn + '18', borderColor: p.warn + '44' },
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
        onTouchEnd={(e) => sync(e.nativeEvent.touches, true)}
        onTouchCancel={(e) => sync(e.nativeEvent.touches ?? [], true)}>
        {dots.length === 0 ? (
          <View pointerEvents="none" style={st.emptyWrap}>
            <Icon name="touch" size={32} color={p.faint} />
            <Text style={[st.empty, { color: p.sub }]}>手指按在这里</Text>
            <Text style={[st.emptySub, { color: p.faint }]}>每根手指按住一个位置</Text>
          </View>
        ) : null}

        {locked ? (
          <View pointerEvents="none" style={[st.banner, { backgroundColor: p.info + '22', borderColor: p.info + '55' }]}>
            <Icon name="lock" size={14} color={p.info} />
            <Text style={[st.bannerText, { color: p.info }]}>手指已抬起，位置保留 10 秒</Text>
          </View>
        ) : null}

        {winner ? (
          <View pointerEvents="none" style={[st.banner, { backgroundColor: p.ok + '22', borderColor: p.ok + '55' }]}>
            <Icon name="trophy" size={15} color={p.ok} />
            <Text style={[st.bannerText, { color: p.ok }]}>中奖的就是这一位</Text>
          </View>
        ) : null}

        {dots.map((d, i) => (
          <DotView
            key={d.id}
            x={d.x}
            y={d.y}
            index={i + 1}
            lit={lit === d.id}
            winner={winner === d.id}
            dim={winner != null && winner !== d.id}
          />
        ))}
      </View>
    </Page>
  );
}

/** 单个圆点：外层负责定位，内层负责高亮 / 中奖放大 */
function DotView(props: {
  x: number;
  y: number;
  index: number;
  lit: boolean;
  winner: boolean;
  dim: boolean;
}) {
  const p = usePalette();
  const appear = useRef(new Animated.Value(0)).current;
  const litV = useRef(new Animated.Value(0)).current;
  const winV = useRef(new Animated.Value(0)).current;
  const dimV = useRef(new Animated.Value(1)).current;

  // 出现时轻微弹入，不做常驻闪烁（避免满屏乱闪）
  useEffect(() => {
    Animated.spring(appear, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [appear]);

  useEffect(() => {
    Animated.timing(litV, { toValue: props.lit ? 1 : 0, duration: 110, useNativeDriver: true }).start();
  }, [props.lit, litV]);

  useEffect(() => {
    Animated.spring(winV, {
      toValue: props.winner ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [props.winner, winV]);

  useEffect(() => {
    Animated.timing(dimV, { toValue: props.dim ? 0.32 : 1, duration: 200, useNativeDriver: true }).start();
  }, [props.dim, dimV]);

  const scale = Animated.multiply(
    Animated.multiply(
      appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      litV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }),
    ),
    winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.34] }),
  );

  const bg = props.winner ? p.ok : props.lit ? p.primary : p.primarySoft;
  const border = props.winner ? p.ok : props.lit ? p.primary : p.primary + '66';
  const fg = props.winner ? '#ffffff' : props.lit ? p.onPrimary : p.primary;

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
              opacity: winV.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }),
              transform: [{ scale: winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[st.dot, { backgroundColor: bg, borderColor: border, transform: [{ scale }], opacity: dimV }]}>
        <Text style={[st.dotText, { color: fg }]}>{props.winner ? '中啦' : props.index}</Text>
      </Animated.View>
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    tip: { fontSize: 12.5, lineHeight: 19 },
    countPill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    countNum: { fontSize: 22, fontWeight: '800' },
    countLbl: { fontSize: 11.5, fontWeight: '700' },
    sub: { fontSize: 11.5, marginTop: 8, textAlign: 'center' },
    hintWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    hintText: { fontSize: 12.5, fontWeight: '600', flex: 1, lineHeight: 18 },
    area: {
      flex: 1,
      minHeight: 240,
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
    bannerText: { fontSize: 12.5, fontWeight: '700' },
    dotWrap: { position: 'absolute', left: 0, top: 0, width: DOT_SIZE, height: DOT_SIZE },
    halo: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: HALF,
      borderWidth: 2,
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: HALF,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotText: { fontSize: 15, fontWeight: '800' },
  }),
);

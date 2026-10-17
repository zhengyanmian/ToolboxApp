import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Card, GlassLayer, Icon, Page, SectionTitle, Toggle, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate } from '../native';

type Dot = { id: string; x: number; y: number };

const DOT_SIZE = 56;
const HALF = DOT_SIZE / 2;
const MAX_FINGERS = 10;
/** 按钮在舞台内的位置（舞台坐标），触摸判定与视觉绘制共用同一份 */
const btnRect = (w: number, h: number) => ({
  x: Math.max(12, w / 2 - 104),
  y: Math.max(12, h - 22 - 54),
  w: Math.min(208, Math.max(120, w - 24)),
  h: 54,
});

export default function FingerRoulette({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [size, setSize] = useState({ w: 0, h: 0 });
  /** 当前按住的点（只包含落在舞台内的手指） */
  const [live, setLive] = useState<Dot[]>([]);
  /** 手指抬起后保留的位置，用于「再抽一次」 */
  const [frozen, setFrozen] = useState<Dot[]>([]);
  const [rolling, setRolling] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState('');
  const [autoRoll, setAutoRoll] = useState(true);
  const [btnDown, setBtnDown] = useState(false);

  const stageRef = useRef<any>(null);
  const rect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const liveRef = useRef<Dot[]>([]);
  const frozenRef = useRef<Dot[]>([]);
  const btnIdRef = useRef<string | null>(null);
  const btnStart = useRef({ x: 0, y: 0 });
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollingRef = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;

  const measure = () => {
    const v: any = stageRef.current;
    if (v && typeof v.measureInWindow === 'function') {
      v.measureInWindow((x: number, y: number, w: number, h: number) => {
        rect.current = { x, y, w, h };
      });
    }
  };

  useEffect(() => {
    measure();
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (rollTimer.current) clearInterval(rollTimer.current);
      rollingRef.current = false;
    };
  }, []);

  const points = live.length > 0 ? live : frozen;

  const warn = (msg: string) => {
    setHint(msg);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    nativeVibrate('0,25');
    setTimeout(() => setHint(''), 2400);
  };

  /** 核心：从触摸流里取出「落在舞台内」的手指，并把落在按钮上的那根单独拎出来 */
  const handleTouch = (e: any, phase: 'start' | 'move' | 'end') => {
    const ne = e.nativeEvent;
    const touches: any[] = ne.touches ?? [];
    const changed: any[] = ne.changedTouches ?? [];
    const r = rect.current;
    const br = btnRect(r.w || size.w, r.h || size.h);
    /** 抬起前的手指快照：必须在改写 liveRef 之前取 */
    const prevLive = liveRef.current;
    /** 舞台的窗口坐标；测量失败时退回「用 locationX/locationY（相对舞台）」 */
    const measured = rect.current.w > 0;
    const ox = measured ? r.x : 0;
    const oy = measured ? r.y : 0;
    const stageW = measured ? r.w : size.w;
    const stageH = measured ? r.h : size.h;
    const px = (t: any) => (measured ? (t.pageX ?? 0) : (t.locationX ?? 0)) - ox;
    const py = (t: any) => (measured ? (t.pageY ?? 0) : (t.locationY ?? 0)) - oy;

    if (phase === 'start') {
      if (autoTimer.current) {
        clearTimeout(autoTimer.current);
        autoTimer.current = null;
      }
      if (rollingRef.current) {
        // 抽奖过程中按屏幕不参与
        return;
      }
      setWinner(null);
      setLit(null);
    }

    // 1) 处理刚抬起的手指：如果它是按在「开抽」按钮上的，判定为点击
    if (phase === 'end') {
      for (const t of changed) {
        const id = String(t.identifier);
        if (btnIdRef.current === id) {
          const dx = Math.abs(px(t) - btnStart.current.x);
          const dy = Math.abs(py(t) - btnStart.current.y);
          btnIdRef.current = null;
          setBtnDown(false);
          if (dx < 28 && dy < 28) draw();
        }
      }
    }

    // 2) 收集当前仍在屏幕上的手指（区域外的直接丢弃，不计数也不显示）
    const list: Dot[] = [];
    for (const t of touches) {
      const id = String(t.identifier);
      if (btnIdRef.current === id) continue;
      const x = px(t);
      const y = py(t);
      if (x < 0 || y < 0 || x > stageW || y > stageH) continue;
      const inBtn = x > br.x && x < br.x + br.w && y > br.y && y < br.y + br.h;
      if (inBtn) {
        // 新按在按钮上的手指 → 记成按钮按压，不当作抽奖手指
        if (phase === 'start' && btnIdRef.current === null && !rollingRef.current) {
          btnIdRef.current = id;
          btnStart.current = { x, y };
          setBtnDown(true);
        }
        continue;
      }
      if (list.length < MAX_FINGERS) list.push({ id, x, y });
    }

    if (list.length !== prevLive.length) {
      setWinner(null);
      setLit(null);
    }
    liveRef.current = list;
    setLive(list);

    // 3) 全部手指抬起：保留这批位置，并（可选）自动开抽
    if (phase === 'end' && list.length === 0 && prevLive.length >= 2 && !rollingRef.current) {
      frozenRef.current = prevLive;
      setFrozen(prevLive);
      if (autoRoll) {
        if (autoTimer.current) clearTimeout(autoTimer.current);
        autoTimer.current = setTimeout(() => {
          autoTimer.current = null;
          if (liveRef.current.length === 0) draw();
        }, 280);
      }
    }
  };

  const draw = () => {
    if (rollingRef.current) return;
    const list =
      liveRef.current.length >= 2
        ? liveRef.current
        : frozenRef.current.length >= 2
        ? frozenRef.current
        : [];
    if (list.length < 2) {
      warn('把 2 根以上的手指按在下面这块区域里');
      return;
    }
    if (liveRef.current.length < 2) {
      frozenRef.current = list;
      setFrozen(list);
    }
    setHint('');
    setWinner(null);
    setLit(null);
    rollingRef.current = true;
    setRolling(true);
    nativeVibrate('0,16');

    const ids = list.map((d) => d.id);
    const total = 1100 + Math.random() * 500;
    const t0 = Date.now();
    let i = 0;

    if (rollTimer.current) clearInterval(rollTimer.current);
    rollTimer.current = setInterval(() => {
      setLit(ids[i % ids.length]);
      i += 1;
      if (Date.now() - t0 >= total) {
        if (rollTimer.current) clearInterval(rollTimer.current);
        rollTimer.current = null;
        const win = ids[Math.floor(Math.random() * ids.length)];
        setLit(null);
        setWinner(win);
        setCount((c) => c + 1);
        nativeVibrate('0,30,45,30,45,30');
        rollingRef.current = false;
        setRolling(false);
      }
    }, 85);
  };

  const reset = () => {
    if (rollTimer.current) clearInterval(rollTimer.current);
    rollTimer.current = null;
    rollingRef.current = false;
    liveRef.current = [];
    frozenRef.current = [];
    setLive([]);
    setFrozen([]);
    setLit(null);
    setWinner(null);
    setRolling(false);
    setBtnDown(false);
    setHint('');
    btnIdRef.current = null;
  };

  const need = points.length < 2;
  const br = btnRect(size.w, size.h);
  const winnerIdx = winner ? points.findIndex((d) => d.id === winner) + 1 : 0;

  return (
    <Page
      id="finger"
      title="指尖转"
      onBack={onBack}
      scroll={false}
      contentStyle={{ paddingBottom: 12 }}>
      <Card pad={14} style={{ marginBottom: 10 }}>
        <View style={st.head}>
          <View style={{ flex: 1 }}>
            <Text style={[st.title, { color: p.text }]}>每人一根手指，按在框里</Text>
            <Text style={[st.tip, { color: p.sub }]}>
              只统计按在下面方框内的手指，框外的手指不算。一起松手会自动开抽，也可以直接点框里的「开抽」。
            </Text>
          </View>
          <View
            style={[
              st.pill,
              { backgroundColor: p.primarySoft, borderColor: p.primary + '33' },
            ]}>
            <Text style={[st.pillNum, { color: p.primary }]}>{points.length}</Text>
            <Text style={[st.pillLbl, { color: p.primary }]}>指</Text>
          </View>
        </View>

        <View style={st.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[st.rowTitle, { color: p.text }]}>松手自动开抽</Text>
            <Text style={[st.rowDesc, { color: p.faint }]}>
              {autoRoll ? '手指一起抬起就开始，不用再点按钮' : '抬起后按住位置会保留，再点「开抽」'}
            </Text>
          </View>
          <Toggle value={autoRoll} onChange={setAutoRoll} />
        </View>

        {hint ? (
          <Animated.View
            style={[
              st.hintWrap,
              { backgroundColor: p.warn + '16', borderColor: p.warn + '3d' },
              {
                transform: [
                  { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) },
                ],
              },
            ]}>
            <Icon name="info" size={14} color={p.warn} />
            <Text style={[st.hintText, { color: p.warn }]}>{hint}</Text>
          </Animated.View>
        ) : null}
      </Card>

      <View
        ref={stageRef}
        onLayout={(e) => {
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
          measure();
        }}
        onTouchStart={(e) => handleTouch(e, 'start')}
        onTouchMove={(e) => handleTouch(e, 'move')}
        onTouchEnd={(e) => handleTouch(e, 'end')}
        onTouchCancel={(e) => handleTouch(e, 'end')}
        style={[st.stage, { backgroundColor: p.card, borderColor: p.cardBorder }]}>
        <GlassLayer radius={24} tone="card" />

        {points.length === 0 ? (
          <View pointerEvents="none" style={st.emptyWrap}>
            <Icon name="touch" size={30} color={p.faint} />
            <Text style={[st.empty, { color: p.sub }]}>手指按在这块区域里</Text>
            <Text style={[st.emptySub, { color: p.faint }]}>
              区域外的手指不会被计入 · 最多 {MAX_FINGERS} 根
            </Text>
          </View>
        ) : null}

        {points.map((d, i) => (
          <DotView
            key={d.id}
            x={d.x}
            y={d.y}
            index={i + 1}
            lit={lit === d.id}
            winner={winner === d.id}
            dim={winner != null && winner !== d.id}
            faded={live.length === 0}
          />
        ))}

        {/* 结果行：放在框顶，避免和底部的开抽按钮抢空间 */}
        {winner ? (
          <View
            pointerEvents="none"
            style={[
              st.result,
              { backgroundColor: p.ok + '1f', borderColor: p.ok + '55' },
            ]}>
            <Icon name="trophy" size={15} color={p.ok} />
            <Text style={[st.resultText, { color: p.ok }]}>
              第 {winnerIdx} 位中啦 · 已抽 {count} 次
            </Text>
          </View>
        ) : live.length === 0 && frozen.length >= 2 ? (
          <View
            pointerEvents="none"
            style={[
              st.result,
              { backgroundColor: p.info + '18', borderColor: p.info + '44' },
            ]}>
            <Icon name="lock" size={13} color={p.info} />
            <Text style={[st.resultText, { color: p.info }]}>
              手已抬起，点「再抽一次」可沿用这批位置
            </Text>
          </View>
        ) : null}

        {/* 开抽按钮：视觉层，触摸由舞台统一判定（这样别的手机按着屏幕时也点得动） */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: br.x,
            top: br.y,
            width: br.w,
            height: br.h,
            borderRadius: 999,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 7,
            backgroundColor: rolling ? p.primary + 'cc' : need ? p.chip : p.primary,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: need ? p.chipBorder : 'transparent',
            transform: [{ scale: btnDown ? 0.965 : 1 }],
          }}>
          <GlassLayer radius={999} tone={need ? 'button' : 'primary'} />
          <Icon
            name="wheel"
            size={18}
            color={need ? p.sub : p.onPrimary}
            strokeWidth={1.9}
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: need ? p.sub : p.onPrimary,
            }}>
            {rolling ? '开抽中…' : need ? '按住 2 根手指' : live.length ? '开抽' : '再抽一次'}
          </Text>
        </View>
      </View>

      <View style={st.footer}>
        <Text style={[st.footerText, { color: p.faint }]}>已抽 {count} 次</Text>
        <Text
          onPress={reset}
          style={[st.footerLink, { color: points.length ? p.primary : p.faint }]}>
          清空重置
        </Text>
      </View>
    </Page>
  );
}

/** 单个圆点：外层定位，内层做高亮 / 中奖放大 */
function DotView(props: {
  x: number;
  y: number;
  index: number;
  lit: boolean;
  winner: boolean;
  dim: boolean;
  faded: boolean;
}) {
  const p = usePalette();
  const appear = useRef(new Animated.Value(0)).current;
  const litV = useRef(new Animated.Value(0)).current;
  const winV = useRef(new Animated.Value(0)).current;
  const dimV = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    }).start();
  }, [appear]);

  useEffect(() => {
    Animated.timing(litV, { toValue: props.lit ? 1 : 0, duration: 90, useNativeDriver: true }).start();
  }, [props.lit, litV]);

  useEffect(() => {
    Animated.spring(winV, {
      toValue: props.winner ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 9,
    }).start();
  }, [props.winner, winV]);

  useEffect(() => {
    Animated.timing(dimV, {
      toValue: props.dim ? 0.28 : props.faded ? 0.55 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [props.dim, props.faded, dimV]);

  const scale = Animated.multiply(
    Animated.multiply(
      appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      litV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }),
    ),
    winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] }),
  );

  const bg = props.winner ? p.ok : props.lit ? p.primary : p.primarySoft;
  const border = props.winner ? p.ok : props.lit ? p.primary : p.primary + '59';
  const fg = props.winner ? '#ffffff' : props.lit ? p.onPrimary : p.primary;

  return (
    <View
      pointerEvents="none"
      style={[
        st.dotWrap,
        { transform: [{ translateX: props.x - HALF }, { translateY: props.y - HALF }] },
      ]}>
      {props.winner ? (
        <Animated.View
          style={[
            st.halo,
            {
              borderColor: p.ok,
              opacity: winV.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }),
              transform: [
                { scale: winV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) },
              ],
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          st.dot,
          { backgroundColor: bg, borderColor: border, opacity: dimV, transform: [{ scale }] },
        ]}>
        <Text style={[st.dotText, { color: fg }]}>{props.winner ? '中啦' : props.index}</Text>
      </Animated.View>
    </View>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    title: { fontSize: 14.5, fontWeight: '700', marginBottom: 4 },
    tip: { fontSize: 12, lineHeight: 18 },
    pill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
    },
    pillNum: { fontSize: 21, fontWeight: '800' },
    pillLbl: { fontSize: 11, fontWeight: '700' },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.line,
    },
    rowTitle: { fontSize: 14, fontWeight: '600' },
    rowDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },
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
    stage: {
      flex: 1,
      minHeight: 260,
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    emptyWrap: { alignItems: 'center', gap: 7 },
    empty: { fontSize: 15, fontWeight: '600' },
    emptySub: { fontSize: 11.5 },
    result: {
      position: 'absolute',
      top: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    resultText: { fontSize: 12.5, fontWeight: '700' },
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
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingTop: 8,
    },
    footerText: { fontSize: 11.5 },
    footerLink: { fontSize: 12, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 4 },
  }),
);

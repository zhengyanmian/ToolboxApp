import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Page, GlassLayer, Icon, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { nativeVibrate } from '../native';
import { create, all } from 'mathjs';

const math = create(all);

type Kind = 'num' | 'fn' | 'op' | 'eq';
type KeyDef = { label: string; kind: Kind; act?: string };

/** 只在本地求值：先换符号，再交给 mathjs */
function evalExpr(src: string, angleMode: 'deg' | 'rad'): number {
  let s = src
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
  if (angleMode === 'deg') {
    s = s.replace(/\b(sin|cos|tan)\(/g, '__deg_$1(');
    return normalize(
      math.evaluate(s, {
        __deg_sin: (x: number) => Math.sin((x * Math.PI) / 180),
        __deg_cos: (x: number) => Math.cos((x * Math.PI) / 180),
        __deg_tan: (x: number) => Math.tan((x * Math.PI) / 180),
      }),
    );
  }
  return normalize(math.evaluate(s));
}

function normalize(v: any): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (typeof v !== 'number' && !Number.isFinite(n)) throw new Error('结果不是有效数字');
  if (!Number.isFinite(n)) throw new Error('结果超出范围');
  return n;
}

function fmt(v: number): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '-∞';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return v.toExponential(6);
  return String(Math.round(v * 1e10) / 1e10);
}

const BASIC: KeyDef[][] = [
  [
    { label: 'AC', kind: 'fn', act: 'AC' },
    { label: '%', kind: 'fn', act: '%' },
    { label: 'del', kind: 'fn', act: 'DEL' },
    { label: '÷', kind: 'op' },
  ],
  [
    { label: '7', kind: 'num' },
    { label: '8', kind: 'num' },
    { label: '9', kind: 'num' },
    { label: '×', kind: 'op' },
  ],
  [
    { label: '4', kind: 'num' },
    { label: '5', kind: 'num' },
    { label: '6', kind: 'num' },
    { label: '−', kind: 'op' },
  ],
  [
    { label: '1', kind: 'num' },
    { label: '2', kind: 'num' },
    { label: '3', kind: 'num' },
    { label: '+', kind: 'op' },
  ],
  [
    { label: '00', kind: 'num' },
    { label: '0', kind: 'num' },
    { label: '.', kind: 'num' },
    { label: '=', kind: 'eq' },
  ],
];

const SCI: KeyDef[][] = [
  [
    { label: '(', kind: 'fn', act: '(' },
    { label: ')', kind: 'fn', act: ')' },
    { label: 'π', kind: 'fn', act: 'π' },
    { label: '^', kind: 'op', act: '^' },
  ],
  [
    { label: 'sin', kind: 'fn', act: 'sin(' },
    { label: 'cos', kind: 'fn', act: 'cos(' },
    { label: 'tan', kind: 'fn', act: 'tan(' },
    { label: '√', kind: 'fn', act: '√(' },
  ],
  [
    { label: 'ln', kind: 'fn', act: 'log(' },
    { label: '!', kind: 'fn', act: '!' },
    { label: 'e', kind: 'fn', act: 'e' },
    { label: '1/x', kind: 'fn', act: '^(-1)' },
  ],
];

let keySeed = 0;

/** 单个圆键：纯视觉层，不接触摸（触摸统一交给键盘容器判定） */
function KeyFace(props: {
  k: KeyDef;
  size: number;
  active: boolean;
  pt: { x: number; y: number } | null;
}) {
  const p = usePalette();
  const gid = useMemo(() => `kg${(keySeed += 1)}`, []);
  const k = props.k;
  const isEq = k.kind === 'eq';
  const bg = isEq
    ? '#a9a2e6'
    : k.kind === 'op'
    ? p.primarySoft
    : k.kind === 'fn'
    ? p.isDark
      ? 'rgba(255,255,255,0.11)'
      : 'rgba(15,23,42,0.055)'
    : p.isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(15,23,42,0.035)';
  const fg = isEq
    ? '#ffffff'
    : k.label === 'AC'
    ? p.warn
    : k.kind === 'op'
    ? p.primary
    : p.text;

  return (
    <View
      pointerEvents="none"
      style={[
        st.key,
        {
          width: props.size,
          height: props.size,
          borderRadius: props.size / 2,
          backgroundColor: bg,
          transform: [{ scale: props.active ? 0.93 : 1 }],
        },
      ]}>
      <GlassLayer radius={props.size / 2} tone={isEq ? 'primary' : 'button'} />
      {props.active && props.pt ? (
        <View
          style={[StyleSheet.absoluteFill, { borderRadius: props.size / 2, overflow: 'hidden' }]}>
          <Svg width={props.size} height={props.size}>
            <Defs>
              <RadialGradient
                id={gid}
                cx={props.pt.x}
                cy={props.pt.y}
                rx={props.size * 0.8}
                ry={props.size * 0.8}
                gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.42} />
                <Stop offset="0.6" stopColor="#ffffff" stopOpacity={0.14} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={props.pt.x} cy={props.pt.y} r={props.size * 0.8} fill={`url(#${gid})`} />
          </Svg>
        </View>
      ) : null}
      {k.label === 'del' ? (
        <Icon name="close" size={Math.round(props.size * 0.28)} color={fg} strokeWidth={2} />
      ) : (
        <Text
          style={{
            fontSize: k.label.length > 2 ? props.size * 0.27 : props.size * 0.34,
            fontWeight: k.kind === 'num' ? '500' : '600',
            color: fg,
          }}>
          {k.label}
        </Text>
      )}
    </View>
  );
}

export default function Calculator({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [sci, setSci] = useState(false);
  const [deg, setDeg] = useState<'deg' | 'rad'>('deg');
  const [showHis, setShowHis] = useState(false);
  const [hover, setHover] = useState<{ row: number; col: number; x: number; y: number } | null>(
    null,
  );
  const hoverRef = useRef<typeof hover>(null);
  hoverRef.current = hover;
  const lastAc = useRef(0);

  let preview = '';
  try {
    if (expr.trim() && !/[+\-×÷*/^(]$/.test(expr.trim())) preview = '= ' + fmt(evalExpr(expr, deg));
  } catch {
    preview = '';
  }

  const press = (k: KeyDef) => {
    const act = k.act ?? k.label;
    if (act === 'AC') {
      const now = Date.now();
      const dbl = now - lastAc.current < 320;
      lastAc.current = now;
      setExpr('');
      setResult('');
      if (dbl) setHistory([]);
      return;
    }
    if (act === 'DEL') {
      setExpr((s) => s.slice(0, -1));
      setResult('');
      return;
    }
    if (k.kind === 'eq') {
      if (!expr.trim()) return;
      try {
        const v = evalExpr(expr, deg);
        const out = fmt(v);
        setHistory((h) => [`${expr} = ${out}`, ...h].slice(0, 40));
        setResult(out);
        setExpr(out);
      } catch {
        setResult('表达式无效');
      }
      return;
    }
    setResult('');
    setExpr((s) => {
      if (k.kind === 'op' && /[+\-×÷*/^]$/.test(s) && s.length > 0) return s.slice(0, -1) + act;
      if (act === '.') {
        const tail = s.split(/[^0-9.]/).pop() ?? '';
        if (tail.includes('.')) return s;
        if (!tail) return s + '0.';
      }
      return s + act;
    });
  };

  const pad = 14;
  const gap = 8;
  const rowsAll = sci ? [...SCI, ...BASIC] : BASIC;
  const rowCount = rowsAll.length;
  const byWidth = (width - pad * 2 - gap * 3) / 4;
  const byHeight = (height - 236 - gap * (rowCount - 1)) / rowCount;
  const keySize = Math.max(42, Math.min(78, byWidth, byHeight));

  /** 命中测试：触点换算成行列，落在间隙里返回 null */
  const hitTest = (x: number, y: number) => {
    const col = Math.floor((x - pad) / (keySize + gap));
    const row = Math.floor(y / (keySize + gap));
    if (col < 0 || col > 3 || row < 0 || row >= rowCount) return null;
    const inX = x - pad - col * (keySize + gap);
    const inY = y - row * (keySize + gap);
    if (inX > keySize || inY > keySize) return null;
    if (!rowsAll[row]?.[col]) return null;
    return { row, col, x: inX, y: inY };
  };

  return (
    <Page
      id="calculator"
      title="计算器"
      onBack={onBack}
      scroll={false}
      noDetail
      contentStyle={{ padding: 0 }}>
      <View style={{ flex: 1 }}>
        <View style={[st.toolbar, { paddingHorizontal: pad }]}>
          <Tap
            onPress={() => setSci((v) => !v)}
            glow
            style={[
              st.tool,
              {
                backgroundColor: sci ? p.primary : p.chip,
                borderColor: sci ? 'transparent' : p.chipBorder,
              },
            ]}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: sci ? p.onPrimary : p.sub }}>
              √π
            </Text>
          </Tap>
          <Tap
            onPress={() => setDeg((d) => (d === 'deg' ? 'rad' : 'deg'))}
            glow
            style={[st.tool, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: p.sub }}>
              {deg === 'deg' ? 'DEG' : 'RAD'}
            </Text>
          </Tap>
          <View style={{ flex: 1 }} />
          <Tap
            onPress={() => setShowHis((v) => !v)}
            glow
            style={[
              st.tool,
              {
                backgroundColor: showHis ? p.primary : p.chip,
                borderColor: showHis ? 'transparent' : p.chipBorder,
              },
            ]}>
            <Icon name="clock" size={17} color={showHis ? p.onPrimary : p.sub} />
          </Tap>
        </View>

        <View style={[st.display, { paddingHorizontal: pad + 6 }]}>
          {showHis ? (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <Text style={[st.hisEmpty, { color: p.faint }]}>还没有计算记录</Text>
              ) : (
                history.map((h, i) => (
                  <Text
                    key={i}
                    selectable
                    onPress={() => {
                      setExpr(h.split(' = ').pop() ?? '');
                      setShowHis(false);
                    }}
                    style={[st.hisItem, { color: p.sub }]}>
                    {h}
                  </Text>
                ))
              )}
            </ScrollView>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                showsVerticalScrollIndicator={false}>
                <Text
                  selectable
                  style={{
                    fontSize: expr.length > 26 ? 22 : expr.length > 16 ? 27 : 33,
                    color: expr ? p.text : p.faint,
                    textAlign: 'right',
                    lineHeight: (expr.length > 26 ? 22 : expr.length > 16 ? 27 : 33) * 1.28,
                  }}>
                  {expr || '0'}
                </Text>
              </ScrollView>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: result ? p.primary : p.faint,
                  textAlign: 'right',
                  marginTop: 6,
                  minHeight: 22,
                }}>
                {result || preview}
              </Text>
            </>
          )}
        </View>

        {/* 键盘：整块接管触摸——按下/滑过只给光效与震动，松手在哪个键上才输入 */}
        <View
          style={{ paddingHorizontal: pad, paddingBottom: 16 }}
          onTouchStart={(e) => {
            const h = hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY);
            setHover(h);
            if (h) nativeVibrate('0,10');
          }}
          onTouchMove={(e) => {
            const h = hitTest(e.nativeEvent.locationX, e.nativeEvent.locationY);
            if (!h) return; // 划过间隙保持上一个键，手感更稳
            const prev = hoverRef.current;
            setHover(h);
            if (!prev || prev.row !== h.row || prev.col !== h.col) nativeVibrate('0,8');
          }}
          onTouchEnd={() => {
            const h = hoverRef.current;
            setHover(null);
            if (h) press(rowsAll[h.row][h.col]);
          }}
          onTouchCancel={() => setHover(null)}>
          {rowsAll.map((row, ri) => (
            <View
              key={ri}
              style={{ flexDirection: 'row', gap, marginBottom: ri === rowCount - 1 ? 0 : gap }}>
              {row.map((k, ci) => (
                <KeyFace
                  key={`${ri}-${ci}`}
                  k={k}
                  size={keySize}
                  active={hover?.row === ri && hover?.col === ci}
                  pt={hover?.row === ri && hover?.col === ci ? { x: hover.x, y: hover.y } : null}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

const st = dynStyles(() =>
  StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    tool: {
      height: 34,
      minWidth: 44,
      paddingHorizontal: 12,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    display: { flex: 1, justifyContent: 'flex-end', paddingBottom: 10 },
    hisEmpty: { fontSize: 13, paddingTop: 10 },
    hisItem: { fontSize: 14, paddingVertical: 7, textAlign: 'right' },
    key: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  }),
);

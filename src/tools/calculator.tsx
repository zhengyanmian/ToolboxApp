import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Page, GlassLayer, Icon, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { create, all } from 'mathjs';

const math = create(all);

type Kind = 'num' | 'fn' | 'op' | 'eq';

/** 只在本地求值：先替换成 mathjs 能懂的符号，再交给 mathjs */
function evalExpr(src: string, angleMode: 'deg' | 'rad'): number {
  let s = src
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
  if (angleMode === 'deg') {
    // 角度制：把 sin/cos/tan 换成包装函数，避免 mathjs 默认弧度
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
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return v.toExponential(6).replace(/e([+-])/, 'e$1');
  const r = Math.round(v * 1e10) / 1e10;
  return String(r);
}

type KeyDef = { label: string; kind: Kind; act?: string };

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

export default function Calculator({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [sci, setSci] = useState(false);
  const [deg, setDeg] = useState<'deg' | 'rad'>('deg');
  const [showHis, setShowHis] = useState(false);
  const lastTap = useRef(0);

  /** 实时预览：能算出来就显示，算不出来不打扰 */
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
      if (now - lastTap.current < 320) {
        setHistory([]);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
      setExpr('');
      setResult('');
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
      } catch (e: any) {
        setResult('表达式无效');
      }
      return;
    }
    setResult('');
    setExpr((s) => {
      // 避免连续运算符
      if (k.kind === 'op' && /[+\-×÷*/^]$/.test(s) && s.length > 0) return s.slice(0, -1) + act;
      if (act === '.' ) {
        const tail = s.split(/[^0-9.]/).pop() ?? '';
        if (tail.includes('.')) return s;
        if (!tail) return s + '0.';
      }
      return s + act;
    });
  };

  const pad = 14;
  const gap = 8;
  const cols = 4;
  const rows = sci ? 9 : 5;
  // 同时受「屏宽」和「屏高」约束：开了科学函数多出 4 行，圆键要自动缩小，否则会顶出屏幕
  const byWidth = (width - pad * 2 - gap * (cols - 1)) / cols;
  const byHeight = (height - 236 - gap * (rows - 1)) / rows;
  const keySize = Math.max(42, Math.min(78, byWidth, byHeight));

  const renderKey = (k: KeyDef, i: number) => {
    const isEq = k.kind === 'eq';
    const bg = isEq
      ? p.isDark
        ? '#b3abe8'
        : '#a9a2e6'
      : k.kind === 'op'
      ? p.primarySoft
      : k.kind === 'fn'
      ? p.isDark
        ? 'rgba(255,255,255,0.11)'
        : 'rgba(255,255,255,0.95)'
      : p.isDark
      ? 'rgba(255,255,255,0.055)'
      : 'rgba(255,255,255,0.82)';
    const fg = isEq
      ? '#ffffff'
      : k.label === 'AC'
      ? p.warn
      : k.kind === 'op'
      ? p.primary
      : p.text;
    return (
      <Tap
        key={`${k.label}${i}`}
        onPress={() => press(k)}
        scaleTo={0.92}
        style={[
          st.key,
          {
            width: keySize,
            height: keySize,
            borderRadius: keySize / 2,
            backgroundColor: bg,
            borderWidth: k.kind === 'eq' ? 0 : StyleSheet.hairlineWidth,
            borderColor: p.isDark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.045)',
          },
        ]}>
        <GlassLayer radius={keySize / 2} tone={isEq ? 'primary' : 'button'} />
        {k.label === 'del' ? (
          <Icon name="close" size={20} color={fg} strokeWidth={2} />
        ) : (
          <Text
            style={{
              fontSize: k.label.length > 2 ? keySize * 0.27 : keySize * 0.34,
              fontWeight: k.kind === 'num' ? '500' : '600',
              color: fg,
            }}>
            {k.label}
          </Text>
        )}
      </Tap>
    );
  };

  const exprSize = expr.length > 26 ? 22 : expr.length > 16 ? 27 : 33;

  return (
    <Page id="calculator" title="计算器" onBack={onBack} scroll={false} contentStyle={{ padding: 0 }}>
      <View style={{ flex: 1 }}>
        {/* 顶部小工具条 */}
        <View style={[st.toolbar, { paddingHorizontal: pad }]}>
          <Tap
            onPress={() => setSci((v) => !v)}
            style={[
              st.tool,
              { backgroundColor: sci ? p.primary : p.chip, borderColor: sci ? 'transparent' : p.chipBorder },
            ]}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: sci ? p.onPrimary : p.sub }}>
              √π
            </Text>
          </Tap>
          <Tap
            onPress={() => setDeg((d) => (d === 'deg' ? 'rad' : 'deg'))}
            style={[st.tool, { backgroundColor: p.chip, borderColor: p.chipBorder }]}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: p.sub }}>
              {deg === 'deg' ? 'DEG' : 'RAD'}
            </Text>
          </Tap>
          <View style={{ flex: 1 }} />
          <Tap
            onPress={() => setShowHis((v) => !v)}
            style={[
              st.tool,
              { backgroundColor: showHis ? p.primary : p.chip, borderColor: showHis ? 'transparent' : p.chipBorder },
            ]}>
            <Icon name="clock" size={17} color={showHis ? p.onPrimary : p.sub} />
          </Tap>
        </View>

        {/* 显示区 */}
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
                      const v = h.split(' = ').pop() ?? '';
                      setExpr(v);
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
                    fontSize: exprSize,
                    fontWeight: '400',
                    color: expr ? p.text : p.faint,
                    textAlign: 'right',
                    lineHeight: exprSize * 1.28,
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
                {result ? (preview ? preview : result) : preview}
              </Text>
            </>
          )}
        </View>

        {/* 键盘 */}
        <View style={{ paddingHorizontal: pad, paddingBottom: 16 }}>
          {sci
            ? SCI.map((row, ri) => (
                <View key={`s${ri}`} style={[st.row, { gap, marginBottom: gap }]}>
                  {row.map((k, i) => renderKey(k, i))}
                </View>
              ))
            : null}
          {BASIC.map((row, ri) => (
            <View key={`b${ri}`} style={[st.row, { gap, marginBottom: ri === BASIC.length - 1 ? 0 : gap }]}>
              {row.map((k, i) => renderKey(k, i))}
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

const st = dynStyles(() =>
  StyleSheet.create({
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 4 },
    tool: {
      height: 34,
      minWidth: 44,
      paddingHorizontal: 12,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    display: { flex: 1, justifyContent: 'flex-end', paddingBottom: 10 },
    hisEmpty: { fontSize: 13, paddingTop: 10 },
    hisItem: { fontSize: 14, paddingVertical: 7, textAlign: 'right' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    key: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  }),
);

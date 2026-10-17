import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Card, Chip, Icon, Page, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { copyText, nativeVibrate } from '../native';

/** 转盘直径随屏宽自适应，窄屏（320dp）也不会溢出卡片 */
const WIN_W = Dimensions.get('window').width;
const SIZE = Math.max(212, Math.min(288, Math.round(WIN_W - 84)));
const R = SIZE / 2 - 8;
const CX = SIZE / 2;
const CY = SIZE / 2;

const PALETTE = [
  '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#0ea5e9', '#a3e635', '#e879f9', '#fbbf24',
];

/** deg 从正上方起顺时针 */
function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** 按扇区底色亮度取黑/白文字，浅色扇区（柠檬、琥珀）也能看清 */
function textOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const v = parseInt(m[1], 16);
  const l = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return l > 0.63 ? '#111827' : '#ffffff';
}

const PRESETS: { label: string; items: string[] }[] = [
  { label: '吃什么', items: ['火锅', '烧烤', '日料', '家常菜', '麦当劳', '面条', '轻食'] },
  { label: '谁来做', items: ['我来', '你来', '一起来', '点外卖', '摇人'] },
  { label: '去不去', items: ['去', '不去', '再想想'] },
  { label: '幸运转盘', items: ['1', '2', '3', '4', '5', '6'] },
];

export default function DecisionWheel({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const [options, setOptions] = useState<string[]>(['吃饭', '睡觉', '打游戏', '加班']);
  const [result, setResult] = useState('');
  const [resultIdx, setResultIdx] = useState(-1);
  const [spinning, setSpinning] = useState(false);

  const spin = useRef(new Animated.Value(0)).current;
  const acc = useRef(0);

  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1deg'] });

  const n = options.length;
  const seg = 360 / Math.max(1, n);

  const segments = useMemo(() => {
    const list: {
      d: string;
      fill: string;
      tx: number;
      ty: number;
      rot: number;
      label: string;
      fs: number;
    }[] = [];
    // 字号与截断长度都按半径换算，扇区再小也不会把字挤出边界
    const fs = n <= 4 ? 15 : n <= 6 ? 13.5 : n <= 8 ? 12 : 10.5;
    const maxChars = Math.max(2, Math.floor((R * 0.72) / fs));
    options.forEach((op, i) => {
      const a0 = i * seg;
      const a1 = (i + 1) * seg;
      const [x0, y0] = polar(R, a0);
      const [x1, y1] = polar(R, a1);
      const large = seg > 180 ? 1 : 0;
      const c = a0 + seg / 2;
      const [tx, ty] = polar(R * 0.64, c);
      const fill = PALETTE[i % PALETTE.length];
      list.push({
        d: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`,
        fill,
        tx,
        ty,
        rot: c - 90, // 文字沿半径由内向外读
        label: op.length > maxChars ? op.slice(0, maxChars - 1) + '…' : op,
        fs,
      });
    });
    return list;
  }, [options, seg, n]);

  const doSpin = () => {
    if (spinning || n < 2) return;
    setSpinning(true);
    setResult('');
    setResultIdx(-1);
    nativeVibrate('0,18');

    // 先随机定下中奖扇区，再反解出让该扇区中心停在指针正上方所需的角度
    const idx = Math.floor(Math.random() * n);
    const rest = (360 - (idx + 0.5) * seg + 720) % 360;
    const turns = 4 + Math.floor(Math.random() * 3);
    const cur = ((acc.current % 360) + 360) % 360;
    const target = acc.current + turns * 360 + (((rest - cur) % 360) + 360) % 360;
    acc.current = target;

    Animated.timing(spin, {
      toValue: target,
      duration: 3400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setResult(options[idx]);
      setResultIdx(idx);
      nativeVibrate('0,40,70,40');
    });
  };

  const setAt = (i: number, v: string) => setOptions(options.map((o, k) => (k === i ? v : o)));
  const addOne = () => {
    if (options.length >= 12) return;
    setOptions([...options, `选项 ${options.length + 1}`]);
  };
  const delOne = (i: number) => setOptions(options.filter((_, k) => k !== i));

  return (
    <Page id="wheel" title="决定转盘" onBack={onBack}>
      <Card style={{ alignItems: 'center' }} pad={18}>
        <View style={{ width: SIZE, height: SIZE }}>
          {/* 转盘本体（随角度旋转） */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
            <Svg width={SIZE} height={SIZE}>
              <Defs>
                <RadialGradient id="wheelShine" cx="0.32" cy="0.24" r="0.85">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity={0.32} />
                  <Stop offset="0.55" stopColor="#ffffff" stopOpacity={0.04} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={0.14} />
                </RadialGradient>
                <LinearGradient id="wheelRim" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity={0.85} />
                  <Stop offset="1" stopColor="#ffffff" stopOpacity={0.18} />
                </LinearGradient>
              </Defs>

              {segments.map((s, i) => (
                <Path key={`s${i}`} d={s.d} fill={s.fill} />
              ))}
              {/* 高光/阴影叠加，做出球面玻璃感 */}
              <Circle cx={CX} cy={CY} r={R} fill="url(#wheelShine)" />
              <Circle cx={CX} cy={CY} r={R - 1} fill="none" stroke="url(#wheelRim)" strokeWidth={2.5} />

              {segments.map((s, i) => (
                <SvgText
                  key={`t${i}`}
                  x={s.tx}
                  y={s.ty}
                  fill={textOn(s.fill)}
                  fontSize={s.fs}
                  fontWeight="700"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${s.rot} ${s.tx} ${s.ty})`}>
                  {s.label}
                </SvgText>
              ))}
            </Svg>
          </Animated.View>

          {/* 轴心：不随转盘旋转，永远压在正中心 */}
          <View style={st.hubWrap} pointerEvents="none">
            <View style={st.hubOuter}>
              <View style={st.hubMid} />
              <View style={st.hubDot} />
            </View>
          </View>

          {/* 指针：绝对定位在转盘正上方，针尖正好落在圆周顶点 */}
          <View style={st.pointerWrap} pointerEvents="none">
            <Svg width={22} height={20}>
              <Defs>
                <LinearGradient id="ptr" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={p.warn} stopOpacity={1} />
                  <Stop offset="1" stopColor={p.warn} stopOpacity={0.72} />
                </LinearGradient>
              </Defs>
              <Polygon points="11,20 1,1 21,1" fill="url(#ptr)" stroke="#ffffff" strokeWidth={1.2} />
            </Svg>
          </View>
        </View>

        <Tap
          onPress={doSpin}
          disabled={spinning || n < 2}
          style={[st.spinBtn, { backgroundColor: p.primary, opacity: spinning || n < 2 ? 0.55 : 1 }]}>
          <Icon name={spinning ? 'refresh' : 'play'} size={18} color="#ffffff" strokeWidth={2.2} />
          <Text style={st.spinTxt}>
            {spinning ? '转动中…' : n < 2 ? '至少要有 2 个选项' : '开始转动'}
          </Text>
        </Tap>

        {result ? (
          <View style={st.resWrap}>
            <Text style={[st.resLabel, { color: p.sub }]}>
              {spinning ? '转动中…' : '结果是'}
            </Text>
            <View style={[st.resBox, { backgroundColor: PALETTE[resultIdx % PALETTE.length] }]}>
              <Text style={st.resTxt} selectable>
                {result}
              </Text>
            </View>
            <View style={st.resActions}>
              <Chip text="复制结果" icon="copy" onPress={() => copyText(result)} />
              <Chip text="再转一次" icon="refresh" onPress={doSpin} />
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <View style={st.head}>
          <Text style={[st.sec, { color: p.text }]}>选项</Text>
          <Text style={[st.count, { color: p.faint }]}>{n} / 12</Text>
        </View>

        {options.map((op, i) => (
          <View key={i} style={st.row}>
            <View style={[st.idx, { backgroundColor: PALETTE[i % PALETTE.length] + '26', borderColor: PALETTE[i % PALETTE.length] }]}>
              <Text style={[st.idxTxt, { color: PALETTE[i % PALETTE.length] }]}>{i + 1}</Text>
            </View>
            <TextInput
              style={[st.optInput, { backgroundColor: p.input, borderColor: p.line, color: p.text }]}
              value={op}
              onChangeText={(v) => setAt(i, v)}
              placeholder={`选项 ${i + 1}`}
              placeholderTextColor={p.faint}
              maxLength={16}
            />
            <Tap
              onPress={() => delOne(i)}
              disabled={n <= 2}
              style={[st.delBtn, { backgroundColor: p.chip, borderColor: p.chipBorder, opacity: n <= 2 ? 0.4 : 1 }]}
              hitSlop={6}>
              <Icon name="close" size={16} color={p.warn} strokeWidth={2.4} />
            </Tap>
          </View>
        ))}

        <View style={st.chipWrap}>
          <Chip
            text="添加选项"
            icon="plus"
            onPress={addOne}
            style={{ opacity: n >= 12 ? 0.4 : 1 }}
          />
          <Chip text="清空重填" icon="trash" onPress={() => { setOptions(['', '']); setResult(''); }} />
          <Chip
            text="恢复默认"
            icon="refresh"
            onPress={() => { setOptions(['吃饭', '睡觉', '打游戏', '加班']); setResult(''); }}
          />
        </View>

        <Text style={[st.hint, { color: p.faint }]}>
          每行一个选项，最多 12 个；点右侧叉叉可以删掉。想不出选项就直接套用下面的模板：
        </Text>
        <View style={st.chipWrap}>
          {PRESETS.map((ps) => (
            <Chip
              key={ps.label}
              text={ps.label}
              onPress={() => {
                setOptions(ps.items.slice(0, 12));
                setResult('');
              }}
            />
          ))}
        </View>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    hubWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    hubOuter: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.95)',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
    },
    hubMid: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(15,23,42,0.10)',
    },
    hubDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#0f172a',
    },
    pointerWrap: { position: 'absolute', top: -14, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
    spinBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
      paddingVertical: 13,
      paddingHorizontal: 30,
      borderRadius: 999,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    spinTxt: { color: '#ffffff', fontSize: 15.5, fontWeight: '700' },
    resWrap: { alignItems: 'center', marginTop: 16, alignSelf: 'stretch' },
    resLabel: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
    resBox: {
      alignSelf: 'stretch',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resTxt: { color: '#ffffff', fontSize: 24, fontWeight: '800', lineHeight: 32 },
    resActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sec: { fontSize: 15, fontWeight: '600' },
    count: { fontSize: 12, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    idx: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    idxTxt: { fontSize: 12, fontWeight: '800' },
    optInput: {
      flex: 1,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14.5,
    },
    delBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    hint: { fontSize: 12, lineHeight: 19, marginTop: 12, marginBottom: 2 },
  }),
);

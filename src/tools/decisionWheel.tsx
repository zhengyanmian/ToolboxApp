import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Polygon, G, Text as SvgText } from 'react-native-svg';
import { Page, Card, Btn, Field, C, dynStyles} from '../ui';

const SIZE = 280;
const R = SIZE / 2 - 6;
const CX = SIZE / 2;
const CY = SIZE / 2;
const PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export default function DecisionWheel({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState('吃饭\n睡觉\n打游戏\n加班');
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState('');
  const spin = useRef(new Animated.Value(0)).current;
  const acc = useRef(0);
  const spinning = useRef(false);

  const options = text
    .split(/[\n,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  const doSpin = () => {
    if (spinning.current || options.length < 2) return;
    spinning.current = true;
    setResult('');
    const target = acc.current + 360 * (4 + Math.random() * 3) + Math.random() * 360;
    acc.current = target;
    Animated.timing(spin, {
      toValue: target,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      spinning.current = false;
      const seg = 360 / options.length;
      // 指针在正上方（0°）；转盘顺时针转了 target
      const norm = ((360 - (target % 360)) % 360) + seg / 2;
      const idx = Math.floor(norm / seg) % options.length;
      setResult(options[idx]);
    });
  };

  const seg = 360 / Math.max(1, options.length);
  const rot = spin.interpolate({ inputRange: [0, 360000], outputRange: ['0deg', '360000deg'] });

  return (
    <Page id="wheel" title="决定转盘" onBack={onBack}>
      <Card style={{ alignItems: 'center' }}>
        <View style={{ width: SIZE + 20, height: SIZE + 24, alignItems: 'center' }}>
          <Svg width={18} height={11} style={{ marginBottom: -2, zIndex: 1 }}>
            <Polygon points="9,11 0,0 18,0" fill={C.warn} />
          </Svg>
          <Animated.View style={{ transform: [{ rotate: rot }] }}>
            <Svg width={SIZE} height={SIZE}>
              <G>
                {options.map((op, i) => {
                  const a0 = i * seg;
                  const a1 = (i + 1) * seg;
                  const [x0, y0] = polar(CX, CY, R, a0);
                  const [x1, y1] = polar(CX, CY, R, a1);
                  const large = seg > 180 ? 1 : 0;
                  const [tx, ty] = polar(CX, CY, R * 0.62, a0 + seg / 2);
                  const fs = options.length > 8 ? 11 : options.length > 5 ? 13 : 15;
                  return (
                    <G key={i}>
                      <Path
                        d={`M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`}
                        fill={PALETTE[i % PALETTE.length]}
                      />
                      <SvgText
                        x={tx}
                        y={ty}
                        fill="#ffffff"
                        fontSize={fs}
                        textAnchor="middle"
                        alignmentBaseline="middle">
                        {op.length > 6 ? op.slice(0, 6) : op}
                      </SvgText>
                    </G>
                  );
                })}
                <Path
                  d={`M ${CX} ${CY - 14} m -8 0 a 8 8 0 1 0 16 0 a 8 8 0 1 0 -16 0`}
                  fill="#ffffff"
                />
              </G>
            </Svg>
          </Animated.View>
        </View>
        <Btn text={spinning.current ? '转动中…' : '开始转动'} kind="primary" onPress={doSpin} />
        {result ? <Text style={st.result}>{result}</Text> : null}
      </Card>
      <Card>
        <Field label="选项（每行一个，最多 12 个）" value={text} onChange={setText} multiline />
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  pointer: { color: C.warn, fontSize: 22, marginBottom: -4, zIndex: 1 },
  result: { fontSize: 22, fontWeight: '800', color: C.primary, marginTop: 14 },
}));;

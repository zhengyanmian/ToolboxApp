import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Page, Card, C, dynStyles} from '../ui';
import { startCompass } from '../native';

const SIZE = 260;

export default function Compass({ onBack }: { onBack: () => void }) {
  const [heading, setHeading] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const smooth = useRef(new Animated.Value(0)).current;
  const accHeading = useRef(0);
  const lastRaw = useRef<number | null>(null);

  useEffect(() => {
    const stop = startCompass(100, (v) => {
      if (v.error) {
        setErr(
          v.error === 'no-sensor'
            ? '设备缺少磁力计或加速度计，无法指南'
            : v.error === 'unsupported'
            ? '当前环境不支持传感器'
            : `传感器异常：${v.error}`,
        );
        return;
      }
      setErr('');
      const h = typeof v.heading === 'number' && Number.isFinite(v.heading) ? v.heading : null;
      if (h === null) return;
      setHeading(h);
      let delta = lastRaw.current === null ? 0 : h - lastRaw.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastRaw.current = h;
      accHeading.current += delta;
      Animated.timing(smooth, {
        toValue: accHeading.current,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
    return stop;
  }, [smooth]);

  const rot = smooth.interpolate({ inputRange: [0, 3600], outputRange: ['0deg', '3600deg'] });
  const dirName =
    heading === null
      ? '—'
      : ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(heading / 45) % 8];

  return (
    <Page id="compass" title="指南针" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ rotate: rot }], width: SIZE, height: SIZE }}>
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={SIZE / 2 - 4}
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth={2}
              />
              {Array.from({ length: 72 }).map((_, i) => {
                const major = i % 9 === 0;
                const a = (i * 5 * Math.PI) / 180;
                const r1 = major ? SIZE / 2 - 26 : SIZE / 2 - 14;
                const r2 = SIZE / 2 - 6;
                return (
                  <Line
                    key={i}
                    x1={SIZE / 2 + r1 * Math.sin(a)}
                    y1={SIZE / 2 - r1 * Math.cos(a)}
                    x2={SIZE / 2 + r2 * Math.sin(a)}
                    y2={SIZE / 2 - r2 * Math.cos(a)}
                    stroke={major ? C.text : C.line}
                    strokeWidth={major ? 2 : 1}
                  />
                );
              })}
              <Path
                d={`M ${SIZE / 2} 30 L ${SIZE / 2 - 12} 62 L ${SIZE / 2 + 12} 62 Z`}
                fill="#ef4444"
              />
              <Path
                d={`M ${SIZE / 2} ${SIZE - 30} L ${SIZE / 2 - 12} ${SIZE - 62} L ${SIZE / 2 + 12} ${
                  SIZE - 62
                } Z`}
                fill="#94a3b8"
              />
            </Svg>
          </Animated.View>
          {/* 中心固定指针 */}
          <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
            <View style={st.needleN} />
            <View style={st.needleS} />
          </View>
        </View>
        <Text style={st.degree}>{heading === null ? '--' : `${Math.round(heading)}°`}</Text>
        <Text style={[st.dir, { color: C.primary }]}>{dirName}</Text>
        {err ? <Text style={st.err}>{err}</Text> : null}
      </Card>
      <Card>
        <Text style={st.tip}>
          依据磁力计 + 加速度计较准的磁北方向。附近有磁铁、金属、电器时会偏差；屏幕上方的红色指北，与真北存在磁偏角（中国多数地区 2°~10° 西偏）。手持手机水平旋转画 8 字可校准。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) => StyleSheet.create({
  needleN: {
    position: 'absolute',
    top: SIZE / 2 - 46,
    left: SIZE / 2 - 5,
    width: 10,
    height: 46,
    backgroundColor: '#ef4444',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  needleS: {
    position: 'absolute',
    top: SIZE / 2,
    left: SIZE / 2 - 5,
    width: 10,
    height: 46,
    backgroundColor: '#64748b',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  degree: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    marginTop: 10,
    fontVariant: ['tabular-nums'] as any,
  },
  dir: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  err: { color: C.warn, fontSize: 13, marginTop: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
}));;

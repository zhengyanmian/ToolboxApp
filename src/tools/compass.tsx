import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { Page, Card, Icon, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { startCompass } from '../native';

const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

export default function Compass({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width } = useWindowDimensions();

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

      // 累积最短路径角度，表盘整体逆时针转（磁北始终指向真实方位）
      let delta = lastRaw.current === null ? 0 : h - lastRaw.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastRaw.current = h;
      accHeading.current -= delta;

      Animated.timing(smooth, {
        toValue: accHeading.current,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
    return stop;
  }, [smooth]);

  const rot = smooth.interpolate({ inputRange: [0, 3600], outputRange: ['0deg', '3600deg'] });
  const dirName = heading === null ? '—' : DIRS[Math.round(heading / 45) % 8];

  const size = Math.max(226, Math.min(304, width - 80));
  const cx = size / 2;
  const R = cx - 2;
  const labelR = R - 36;
  const fs = Math.round(size * 0.076);
  const tipR = R * 0.62;
  const halfW = Math.max(7, R * 0.058);

  return (
    <Page id="compass" title="指南针" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 16 }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* 表盘外发光 */}
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="cpHalo" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={p.primary} stopOpacity={p.isDark ? 0.2 : 0.13} />
                <Stop offset="0.75" stopColor={p.primary} stopOpacity={p.isDark ? 0.06 : 0.04} />
                <Stop offset="1" stopColor={p.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cx} cy={cx} r={cx} fill="url(#cpHalo)" />
          </Svg>

          <Animated.View style={{ width: size, height: size, transform: [{ rotate: rot }] }}>
            <Svg width={size} height={size}>
              <Circle cx={cx} cy={cx} r={R} fill={p.cardSolid} stroke={p.track} strokeWidth={1.4} />
              <Circle
                cx={cx}
                cy={cx}
                r={R - 52}
                fill="none"
                stroke={p.line}
                strokeWidth={1}
                strokeDasharray="2 6"
              />

              {/* 72 格刻度：每 5°，45°/90° 加粗加长 */}
              {Array.from({ length: 72 }).map((_, i) => {
                const deg = i * 5;
                const major = i % 18 === 0;
                const mid = i % 9 === 0;
                const quarter = i % 3 === 0;
                const len = major ? 16 : mid ? 12 : quarter ? 8 : 5;
                const a = (deg * Math.PI) / 180;
                const r1 = R - 3;
                const r2 = R - 3 - len;
                return (
                  <Line
                    key={i}
                    x1={cx + r1 * Math.sin(a)}
                    y1={cx - r1 * Math.cos(a)}
                    x2={cx + r2 * Math.sin(a)}
                    y2={cx - r2 * Math.cos(a)}
                    stroke={major ? p.text : mid ? p.sub : quarter ? p.faint : p.line}
                    strokeWidth={major ? 2.2 : mid ? 1.7 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* 指北 / 指南 斜三角 */}
              <Path
                d={`M ${cx} ${cx - tipR} L ${cx - halfW} ${cx} L ${cx + halfW} ${cx} Z`}
                fill={p.warn}
              />
              <Path
                d={`M ${cx} ${cx + tipR} L ${cx - halfW} ${cx} L ${cx + halfW} ${cx} Z`}
                fill={p.faint}
              />

              {/* 轴心 */}
              <Circle cx={cx} cy={cx} r={10} fill={p.cardSolid} stroke={p.line} strokeWidth={1.5} />
              <Circle cx={cx} cy={cx} r={3.6} fill={p.primary} />
            </Svg>

            {/* 主方向字随表盘一起转（原生 Text，中文渲染更稳） */}
            <Text
              style={[
                st.cardinal,
                { fontSize: fs, top: cx - labelR - fs * 0.62, left: 0, right: 0, textAlign: 'center', color: p.warn },
              ]}>
              北
            </Text>
            <Text
              style={[
                st.cardinal,
                { fontSize: fs, top: cx + labelR - fs * 0.62, left: 0, right: 0, textAlign: 'center', color: p.sub },
              ]}>
              南
            </Text>
            <Text
              style={[
                st.cardinal,
                { fontSize: fs, top: cx - fs * 0.62, left: cx + labelR - fs, width: fs * 2, textAlign: 'center', color: p.text },
              ]}>
              东
            </Text>
            <Text
              style={[
                st.cardinal,
                { fontSize: fs, top: cx - fs * 0.62, left: cx - labelR - fs, width: fs * 2, textAlign: 'center', color: p.text },
              ]}>
              西
            </Text>
          </Animated.View>

          {/* 固定读数索引（不随表盘转） */}
          <View style={st.index} pointerEvents="none">
            <Svg width={18} height={13}>
              <Path d="M9 12 1 1h16z" fill={p.primary} />
            </Svg>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}>
          <Text style={[st.degree, { color: p.text }]}>
            {heading === null ? '--' : Math.round(heading)}
          </Text>
          <Text style={[st.degreeUnit, { color: p.sub }]}>°</Text>
        </View>

        <View style={[st.dirPill, { backgroundColor: p.primarySoft }]}>
          <Text style={[st.dir, { color: p.primary }]}>{dirName}</Text>
        </View>

        {err ? (
          <Text style={st.err}>{err}</Text>
        ) : heading === null ? (
          <Text style={st.hint}>正在校准 · 请手持手机水平画「8」字</Text>
        ) : (
          <View style={st.noteRow}>
            <Icon name="info" size={12} color={p.faint} />
            <Text style={st.note}>磁偏角：真北偏西约 2°~10°（中国大部分地区）</Text>
          </View>
        )}
      </Card>

      <Card>
        <Text style={st.tip}>
          依据磁力计 + 加速度计融合解算磁北方向。附近有磁铁、金属、音箱或电器时会明显偏差；红色一端指向磁北。
        </Text>
        <Text style={st.tip2}>
          觉得方向飘时，手持手机水平画几个「8」字重新校准；手机竖直握持时航向误差会变大，尽量保持接近水平。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    cardinal: { position: 'absolute', fontWeight: '700', letterSpacing: 1 },
    index: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
    degree: {
      fontSize: 40,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.5,
    },
    degreeUnit: { fontSize: 18, fontWeight: '700', marginTop: 8, marginLeft: 2 },
    dirPill: {
      paddingHorizontal: 15,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 2,
    },
    dir: { fontSize: 14.5, fontWeight: '700', letterSpacing: 2 },
    hint: { fontSize: 12, color: C.sub, marginTop: 11, textAlign: 'center' },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
    note: { fontSize: 11, color: C.faint },
    err: { color: C.warn, fontSize: 12.5, marginTop: 10, textAlign: 'center' },
    tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
    tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  }),
);

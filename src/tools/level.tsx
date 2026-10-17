import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { Page, Card, Btn, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { startAccelerometer, nativeVibrate } from '../native';

const FLAT_DEG = 1.2;
const MAX_DEG = 30;

function adviceOf(hx: number, hy: number, flat: boolean): string {
  if (flat) return '气泡居中，可以动手了';
  const tips: string[] = [];
  if (Math.abs(hx) >= 0.8) tips.push(hx > 0 ? '右侧偏高，压低右侧' : '左侧偏高，压低左侧');
  if (Math.abs(hy) >= 0.8) tips.push(hy > 0 ? '下侧偏高，压低下侧' : '上侧偏高，压低上侧');
  return tips.length ? tips.join(' · ') : '轻微倾斜，微调一下就好';
}

export default function Level({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width } = useWindowDimensions();

  const [tilt, setTilt] = useState({ x: 0, y: 0, flat: false, err: '' });
  const [zero, setZero] = useState({ x: 0, y: 0 });

  const zeroRef = useRef(zero);
  zeroRef.current = zero;
  const sx = useRef(0);
  const sy = useRef(0);
  const seen = useRef(false);
  const wasFlat = useRef(false);

  useEffect(() => {
    const stop = startAccelerometer(50, (v) => {
      if (v.error) {
        setTilt((t) => ({
          ...t,
          err: v.error === 'no-sensor' ? '设备没有加速度计，无法测量倾角' : `传感器异常：${v.error}`,
        }));
        return;
      }
      const started = seen.current;
      const ax = v.x;
      const ay = v.y;
      const az = v.z;

      // ax → 左右倾斜，ay → 前后倾斜（单位：度）
      const px = Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);
      const py = Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI);

      if (!started) {
        sx.current = px;
        sy.current = py;
        seen.current = true;
      } else {
        // 指数平滑，气泡移动不抖
        sx.current += (px - sx.current) * 0.3;
        sy.current += (py - sy.current) * 0.3;
      }

      const hx = sx.current - zeroRef.current.x;
      const hy = sy.current - zeroRef.current.y;
      const flat = Math.abs(hx) < FLAT_DEG && Math.abs(hy) < FLAT_DEG;

      setTilt({ x: sx.current, y: sy.current, flat, err: '' });

      // 只在「刚进入水平」的瞬间轻震一次
      if (flat && !wasFlat.current && started) nativeVibrate('0,20');
      wasFlat.current = flat;
    });
    return stop;
  }, []);

  // 加速度计存在零点漂移，手机平放也会读到 1° 左右的常值偏差。
  // 用「软死区」把它吃掉：±1.2° 内直接归零，气泡才会真正落在中心靶环上；
  // 用减法而不是硬截断，越过死区时不会突然跳一下。
  const DEAD = 1.2;
  const soft = (v: number) => (Math.abs(v) <= DEAD ? 0 : v - Math.sign(v) * DEAD);
  const hx = soft(tilt.x - zero.x);
  const hy = soft(tilt.y - zero.y);
  const calced = Math.abs(zero.x) > 0.001 || Math.abs(zero.y) > 0.001;

  const board = Math.max(206, Math.min(298, width - 92));
  const cx = board / 2;
  const R = cx - 2;
  const travel = R - 28;
  const clamp = (d: number) => Math.max(-MAX_DEG, Math.min(MAX_DEG, d));
  const dx = (clamp(hx) / MAX_DEG) * travel;
  const dy = (clamp(hy) / MAX_DEG) * travel;

  const bubbleR = Math.max(13, R * 0.085);
  const ringR = R * 0.21;

  return (
    <Page id="level" title="水平仪" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
        <View style={{ width: board, height: board }}>
          <Svg width={board} height={board}>
            {/* 圆盘本体：全部画在 SVG 内，天然被 viewBox 裁掉，不会再露出白边 */}
            <Defs>
              <RadialGradient id="lvGlow" cx="0.5" cy="0.5" r="0.5">
                <Stop
                  offset="0"
                  stopColor={tilt.flat ? p.ok : p.primary}
                  stopOpacity={p.isDark ? 0.14 : 0.08}
                />
                <Stop offset="0.7" stopColor={tilt.flat ? p.ok : p.primary} stopOpacity={0.03} />
                <Stop offset="1" stopColor={tilt.flat ? p.ok : p.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cx} cy={cx} r={R} fill={p.cardSolid} stroke={p.track} strokeWidth={1.5} />
            <Circle cx={cx} cy={cx} r={R - 1} fill="url(#lvGlow)" />

            {/* 外圈刻度：每 10°，90° 加长 */}
            {Array.from({ length: 36 }).map((_, i) => {
              const major = i % 9 === 0;
              const a = (i * 10 * Math.PI) / 180;
              const r1 = R - 1.5;
              const r2 = R - (major ? 11 : 6);
              return (
                <Line
                  key={i}
                  x1={cx + r1 * Math.sin(a)}
                  y1={cx - r1 * Math.cos(a)}
                  x2={cx + r2 * Math.sin(a)}
                  y2={cx - r2 * Math.cos(a)}
                  stroke={major ? p.sub : p.line}
                  strokeWidth={major ? 1.8 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            {/* 十字线：只画在圆内，长度受半径约束 */}
            <Line x1={cx - R + 16} y1={cx} x2={cx + R - 16} y2={cx} stroke={p.line} strokeWidth={1} />
            <Line x1={cx} y1={cx - R + 16} x2={cx} y2={cx + R - 16} stroke={p.line} strokeWidth={1} />

            {/* 中间虚线参考环 */}
            <Circle
              cx={cx}
              cy={cx}
              r={R * 0.56}
              fill="none"
              stroke={p.line}
              strokeWidth={1}
              strokeDasharray="3 6"
            />

            {/* 中心靶环：水平时高亮 */}
            <Circle
              cx={cx}
              cy={cx}
              r={ringR}
              fill={tilt.flat ? p.primarySoft : 'none'}
              stroke={tilt.flat ? p.ok : p.sub}
              strokeWidth={tilt.flat ? 2 : 1.2}
            />
            <Circle cx={cx} cy={cx} r={2.6} fill={tilt.flat ? p.ok : p.faint} />

            {/* 气泡 */}
            <Circle
              cx={cx + dx}
              cy={cx + dy}
              r={bubbleR}
              fill={tilt.flat ? p.ok : p.primary}
              opacity={0.92}
            />
          </Svg>
        </View>

        <Text style={[st.state, { color: tilt.flat ? p.ok : p.text }]}>
          {tilt.err ? '—' : tilt.flat ? '已水平' : '未水平'}
        </Text>
        <Text style={st.angles}>
          {tilt.err
            ? tilt.err
            : `横向偏 ${hx.toFixed(1)}° · 纵向偏 ${hy.toFixed(1)}°`}
        </Text>
        {!tilt.err ? (
          <Text style={[st.advice, { color: tilt.flat ? p.ok : p.sub }]}>
            {adviceOf(hx, hy, tilt.flat)}
          </Text>
        ) : null}

        <View style={st.btnRow}>
          <Btn
            text="校准归零"
            kind="soft"
            size="sm"
            icon="target"
            fit
            onPress={() => setZero({ x: tilt.x, y: tilt.y })}
          />
          {calced ? (
            <Btn
              text="恢复默认"
              kind="ghost"
              size="sm"
              icon="refresh"
              fit
              onPress={() => setZero({ x: 0, y: 0 })}
            />
          ) : null}
        </View>
        {calced ? <Text style={st.calced}>已以当前姿态为零点</Text> : null}
      </Card>

      <Card>
        <Text style={st.tip}>
          把手机平放在被测面上（屏幕朝上），气泡进入中心圈并变绿即为水平。数据来自加速度计重力分量，精度约 ±0.5°。
        </Text>
        <Text style={st.tip2}>
          被测面本身不平（比如桌面有斜度）时，可以先把它当作基准点按「校准归零」，之后再比较其他表面是否与它一致。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    state: { fontSize: 25, fontWeight: '800', marginTop: 16, letterSpacing: 1 },
    angles: {
      fontSize: 13.5,
      color: C.sub,
      marginTop: 5,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      lineHeight: 19,
    },
    advice: { fontSize: 12.5, marginTop: 4, textAlign: 'center' },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    calced: { fontSize: 11, color: C.faint, marginTop: 7 },
    tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
    tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  }),
);

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Page, Card, Segmented, Toggle, Icon, dynStyles } from '../ui';
import { usePalette } from '../theme';
import type { Palette } from '../theme';
import { startMagnetometer, nativeVibrate, cancelVibrate } from '../native';

/** 灵敏度档位 → 触发阈值（µT）。灵敏度越高，越容易被金属触发。 */
type Sens = 'low' | 'mid' | 'high';
const THRESHOLD: Record<Sens, number> = { low: 140, mid: 100, high: 70 };

/** 同一档位重复触发的最小间隔，营造"贴着金属一直哒哒哒"的手感 */
const TRIGGER_GAP = 420;

/** 哒哒哒连击节奏：首项是延迟，之后依次是 震-停-震-停… */
const PULSE_WEAK = '0,30,40';
const PULSE_MID = '0,30,45,30,45,30';
const PULSE_STRONG = '0,25,35,25,35,25,35,25,35,25';

function levelOf(uT: number, th: number, p: Palette): { text: string; color: string } {
  if (uT < th * 0.45) return { text: '环境正常', color: p.ok };
  if (uT < th) return { text: '磁场有波动', color: p.sub };
  if (uT < th * 1.5) return { text: '疑似金属靠近', color: p.primary };
  return { text: '金属信号很强', color: p.warn };
}

export default function MetalDetector({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const { width } = useWindowDimensions();

  const [uT, setUT] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sens, setSens] = useState<Sens>('mid');
  const [vibeOn, setVibeOn] = useState(true);

  // 传感器回调里要读最新档位/开关，用 ref 保存
  const sensRef = useRef<Sens>(sens);
  sensRef.current = sens;
  const vibeRef = useRef(vibeOn);
  vibeRef.current = vibeOn;
  const lastPulse = useRef(0);

  useEffect(() => {
    const stop = startMagnetometer(150, (v) => {
      if (v.error) {
        setError(
          v.error === 'unsupported' || v.error === 'no-sensor'
            ? '此设备没有磁力计传感器，无法使用金属探测'
            : `传感器异常：${v.error}`,
        );
        return;
      }
      setError('');
      const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      if (!Number.isFinite(m)) return;
      setUT(m);

      const th = THRESHOLD[sensRef.current];
      if (!vibeRef.current || m < th) return;
      const now = Date.now();
      if (now - lastPulse.current < TRIGGER_GAP) return;
      lastPulse.current = now;

      // 信号越强，连击次数越多、间隔越短
      const ratio = m / th;
      const pattern = ratio >= 1.55 ? PULSE_STRONG : ratio >= 1.22 ? PULSE_MID : PULSE_WEAK;
      nativeVibrate(pattern);
    });

    return () => {
      stop();
      cancelVibrate();
    };
  }, []);

  const th = THRESHOLD[sens];
  const ratio = uT === null ? 0 : Math.min(1, uT / (th * 1.5));
  const lv = uT === null ? null : levelOf(uT, th, p);

  const gauge = Math.max(178, Math.min(238, width - 122));
  const stroke = 12;
  const cx = gauge / 2;
  const r = cx - stroke / 2 - 7;
  const circ = 2 * Math.PI * r;

  return (
    <Page id="metal" title="金属探测仪" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 16 }}>
        {error ? (
          <View style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
            <Icon name="info" size={30} color={p.warn} />
            <Text style={st.err}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={{ width: gauge, height: gauge, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={gauge} height={gauge} style={StyleSheet.absoluteFill}>
                <Circle cx={cx} cy={cx} r={r} stroke={p.track} strokeWidth={stroke} fill="none" />
                {uT !== null ? (
                  <Circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    stroke={lv ? lv.color : p.primary}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={circ * (1 - ratio)}
                    transform={`rotate(-90 ${cx} ${cx})`}
                  />
                ) : null}
              </Svg>
              <Text style={[st.value, { color: lv ? lv.color : p.sub }]}>
                {uT === null ? '--' : uT.toFixed(1)}
              </Text>
              <Text style={st.unit}>µT · 微特斯拉</Text>
            </View>

            <View style={st.levelRow}>
              <View style={[st.dot, { backgroundColor: lv ? lv.color : p.faint }]} />
              <Text style={[st.level, { color: lv ? lv.color : p.sub }]}>
                {lv ? lv.text : '正在读取磁力计…'}
              </Text>
            </View>

            <View style={st.barWrap}>
              <View
                style={[
                  st.barFill,
                  {
                    width: `${Math.round(ratio * 100)}%` as `${number}%`,
                    backgroundColor: lv ? lv.color : p.faint,
                  },
                ]}
              />
            </View>
            <View style={st.scaleRow}>
              <Text style={st.scale}>0</Text>
              <Text style={st.scale}>{th} µT 触发</Text>
              <Text style={st.scale}>{th * 1.5}+</Text>
            </View>

            {uT === null ? (
              <Text style={st.hint}>
                若长时间没有读数，说明设备不带磁力计（常见于部分平板和低端机）
              </Text>
            ) : null}
          </>
        )}
      </Card>

      <Card pad={14}>
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>灵敏度</Text>
            <Text style={st.rowDesc}>越高越容易触发，环境噪声也会带来更多误报</Text>
          </View>
        </View>
        <Segmented
          options={[
            { label: '低', value: 'low' },
            { label: '中', value: 'mid' },
            { label: '高', value: 'high' },
          ]}
          value={sens}
          onChange={setSens}
          style={{ marginTop: 10 }}
        />
        <View style={[st.row, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>震动提醒</Text>
            <Text style={st.rowDesc}>探到金属时「哒哒哒」连击，越强越急促</Text>
          </View>
          <Toggle
            value={vibeOn}
            onChange={(v) => {
              setVibeOn(v);
              if (!v) cancelVibrate();
            }}
          />
        </View>
      </Card>

      <Card>
        <Text style={st.tip}>
          原理：手机磁力计测量环境磁场强度。地球磁场约 25~65 µT 且相对稳定，铁磁金属（铁、钴、镍）靠近会让读数明显升高。
        </Text>
        <Text style={st.tip2}>
          使用技巧：先远离磁铁、音箱、充电器和手机壳磁扣做基准；探测时缓慢扫过目标物，看读数跳变而不是绝对值。无法探测铝、铜等非磁性金属，也不能替代专业探测器。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    value: {
      fontSize: 46,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.5,
      lineHeight: 56,
    },
    unit: { fontSize: 12, color: C.sub, letterSpacing: 0.8 },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    level: { fontSize: 15.5, fontWeight: '700' },
    barWrap: {
      alignSelf: 'stretch',
      height: 8,
      borderRadius: 4,
      backgroundColor: C.track,
      marginTop: 14,
      overflow: 'hidden',
    },
    barFill: { height: 8, borderRadius: 4 },
    scaleRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    scale: { fontSize: 10.5, color: C.faint, fontVariant: ['tabular-nums'] },
    hint: { fontSize: 11.5, color: C.sub, marginTop: 14, textAlign: 'center', lineHeight: 17 },
    err: { color: C.warn, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowTitle: { fontSize: 14.5, fontWeight: '600', color: C.text },
    rowDesc: { fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 16 },
    tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
    tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  }),
);

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Page, Card, Btn, Icon, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { startNoise, getNoiseAmplitude, stopNoise } from '../native';

/** 波形采样点数：120ms × 25 ≈ 最近 3 秒 */
const WAVE_N = 25;
const WAVE_H = 62;
const DB_MIN = 30;
const DB_MAX = 100;

export default function NoiseMeter({ onBack }: { onBack: () => void }) {
  const p = usePalette();

  const [db, setDb] = useState<number | null>(null);
  const [peak, setPeak] = useState(0);
  const [wave, setWave] = useState<number[]>([]);
  const [err, setErr] = useState('');
  const [starting, setStarting] = useState(true);
  const [waveW, setWaveW] = useState(0);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  const smooth = useRef<number | null>(null);
  const hist = useRef<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const begin = useCallback(async () => {
    clearTimer();
    setErr('');
    setStarting(true);
    setDb(null);
    setPeak(0);
    setWave([]);
    smooth.current = null;
    hist.current = [];

    const e = await startNoise();
    if (!alive.current) {
      stopNoise();
      return;
    }
    if (e) {
      setErr(e);
      setStarting(false);
      return;
    }
    setStarting(false);

    timer.current = setInterval(async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const amp = await getNoiseAmplitude();
        if (!alive.current || amp < 0) return;

        const raw = Math.max(
          DB_MIN,
          Math.min(DB_MAX, 20 * Math.log10(Math.max(1, amp) / 32767) + 100),
        );
        // 指数平滑：80% 旧值 + 20% 新值，肉眼看不出跳变
        const prev = smooth.current;
        const v = prev === null ? raw : prev * 0.8 + raw * 0.2;
        smooth.current = v;

        setDb(v);
        setPeak((pk) => (raw > pk ? raw : pk));

        const h = hist.current;
        h.push(v);
        if (h.length > WAVE_N) h.shift();
        setWave(h.slice());
      } finally {
        busy.current = false;
      }
    }, 120);
  }, [clearTimer]);

  useEffect(() => {
    alive.current = true;
    begin();
    return () => {
      alive.current = false;
      clearTimer();
      stopNoise();
    };
  }, [begin, clearTimer]);

  const amber = p.isDark ? '#fbbf24' : '#d97706';
  const orange = p.isDark ? '#fb923c' : '#ea580c';
  const tone =
    db === null
      ? p.faint
      : db < 40
      ? p.ok
      : db < 60
      ? p.primary
      : db < 75
      ? amber
      : db < 90
      ? orange
      : p.warn;

  const desc =
    db === null
      ? '正在等待麦克风数据…'
      : db < 40
      ? '图书馆级安静'
      : db < 60
      ? '正常交谈音量'
      : db < 75
      ? '有点吵了'
      : db < 90
      ? '很吵，久待伤听力'
      : '噪音危害级，快离开';

  const pct = db === null ? 0 : Math.max(0, Math.min(100, ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100));

  // 波形：不足 25 点时用首点补齐，保证一进页面就是一条完整的线
  const values: number[] =
    wave.length === 0
      ? []
      : wave.length >= WAVE_N
      ? wave.slice(-WAVE_N)
      : [...Array<number>(WAVE_N - wave.length).fill(wave[0]), ...wave];

  const xAt = (i: number) => 1 + (i * Math.max(1, waveW - 2)) / (WAVE_N - 1);
  const yAt = (v: number) =>
    WAVE_H - 6 - ((Math.max(DB_MIN, Math.min(DB_MAX, v)) - DB_MIN) / (DB_MAX - DB_MIN)) * (WAVE_H - 12);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
  const area = line ? `${line} L ${xAt(WAVE_N - 1).toFixed(1)} ${WAVE_H} L ${xAt(0).toFixed(1)} ${WAVE_H} Z` : '';

  return (
    <Page id="noise" title="噪音检测" onBack={onBack}>
      <Card style={{ paddingVertical: 20 }}>
        {err ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <Icon name="info" size={30} color={p.warn} />
            <Text style={st.err}>{err}</Text>
            <Btn text="重试" kind="primary" size="sm" icon="refresh" fit onPress={begin} />
          </View>
        ) : (
          <>
            <View style={st.statusRow}>
              <View style={[st.liveDot, { backgroundColor: starting ? p.faint : p.ok }]} />
              <Text style={st.status}>
                {starting ? '正在启动麦克风…' : '实时监测中 · 无需按键，离开自动停止'}
              </Text>
            </View>

            <View style={st.dbRow}>
              <Text style={[st.db, { color: tone }]}>{db === null ? '--' : db.toFixed(1)}</Text>
              <Text style={[st.unit, { color: p.sub }]}>dB</Text>
            </View>

            <View style={st.barWrap}>
              <View
                style={[
                  st.barFill,
                  { width: `${pct}%` as `${number}%`, backgroundColor: tone },
                ]}
              />
              {[40, 60, 75, 90].map((v) => (
                <View
                  key={v}
                  style={[
                    st.barTick,
                    {
                      left: `${((v - DB_MIN) / (DB_MAX - DB_MIN)) * 100}%` as `${number}%`,
                      backgroundColor: p.cardSolid,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={st.metaRow}>
              <Text style={[st.desc, { color: tone }]}>{desc}</Text>
              <Text style={st.range}>安静 30 · 嘈杂 100</Text>
            </View>

            <View style={st.waveHead}>
              <Icon name="wave" size={13} color={p.faint} />
              <Text style={st.waveTitle}>最近 3 秒波形</Text>
              <View style={{ flex: 1 }} />
              <Text style={st.peak}>峰值 {peak > 0 ? peak.toFixed(1) : '--'} dB</Text>

            </View>
            <View
              style={st.waveBox}
              onLayout={(e) => setWaveW(e.nativeEvent.layout.width)}>
              {waveW > 0 && line ? (
                <Svg width={waveW} height={WAVE_H}>
                  <Defs>
                    <LinearGradient id="noiseFill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={tone} stopOpacity={p.isDark ? 0.32 : 0.24} />
                      <Stop offset="1" stopColor={tone} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Path d={area} fill="url(#noiseFill)" />
                  <Path
                    d={line}
                    fill="none"
                    stroke={tone}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
              ) : null}
            </View>
          </>
        )}
      </Card>

      <Card>
        <Text style={st.tip}>
          用麦克风振幅估算声压级（±5dB 级别误差，非专业计量，仅供感受环境嘈杂程度）。测量时不录音、不保存任何音频。
        </Text>
        <Text style={st.tip2}>
          手机麦克风有自动增益，极安静或极大声时读数会偏保守；对比不同房间时保持手机与声源的距离一致更准。
        </Text>
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
    liveDot: { width: 7, height: 7, borderRadius: 4 },
    status: { fontSize: 12, color: C.sub },
    dbRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 2 },
    db: {
      fontSize: 60,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.5,
      lineHeight: 70,
    },
    unit: { fontSize: 15, fontWeight: '700', marginBottom: 12, marginLeft: 5 },
    barWrap: {
      height: 10,
      borderRadius: 5,
      backgroundColor: C.track,
      marginTop: 6,
      overflow: 'hidden',
    },
    barFill: { height: 10, borderRadius: 5 },
    barTick: { position: 'absolute', top: 0, bottom: 0, width: 1.5, opacity: 0.55 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    desc: { fontSize: 14.5, fontWeight: '700' },
    range: { fontSize: 10.5, color: C.faint },
    waveHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
    waveTitle: { fontSize: 11.5, color: C.faint },
    peak: { fontSize: 11.5, color: C.sub, fontVariant: ['tabular-nums'], marginRight: 6 },
    waveBox: { height: WAVE_H, marginTop: 8 },
    err: { color: C.warn, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
    tip2: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 8 },
  }),
);

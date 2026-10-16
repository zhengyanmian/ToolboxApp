import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Vibration } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../ui';
import { setKeepScreenOn } from '../native';

type Phase = 'work' | 'rest' | 'idle';

const R = 130;
const STROKE = 10;
const CIRC = 2 * Math.PI * R;

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  idle: { label: '准备开始', color: '#94a3b8' },
  work: { label: '专注中', color: '#fb7185' },
  rest: { label: '休息中', color: '#34d399' },
};

export default function Pomodoro({ onBack }: { onBack: () => void }) {
  const [workMin, setWorkMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [phase, setPhase] = useState<Phase>('idle');
  const [leftSec, setLeftSec] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [showCfg, setShowCfg] = useState(false);
  const totalRef = useRef(25 * 60);

  // 运行中屏幕常亮
  useEffect(() => {
    setKeepScreenOn(running);
    return () => setKeepScreenOn(false);
  }, [running]);

  useEffect(() => {
    if (!running || phase === 'idle') return;
    const t = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) {
          try {
            Vibration.vibrate([0, 400, 200, 400]);
          } catch {}
          if (phase === 'work') {
            setRounds((r) => r + 1);
            setPhase('rest');
            totalRef.current = restMin * 60;
            return restMin * 60;
          }
          setPhase('work');
          totalRef.current = workMin * 60;
          return workMin * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase, workMin, restMin]);

  const start = (p: Phase) => {
    const total = (p === 'work' ? workMin : restMin) * 60;
    setPhase(p);
    setLeftSec(total);
    totalRef.current = total;
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setPhase('idle');
    setLeftSec(workMin * 60);
    totalRef.current = workMin * 60;
  };

  const mm = String(Math.floor(leftSec / 60)).padStart(2, '0');
  const ss = String(leftSec % 60).padStart(2, '0');
  const meta = PHASE_META[phase];
  const progress = 1 - leftSec / Math.max(1, totalRef.current);

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity style={st.back} onPress={onBack} hitSlop={12}>
        <Text style={{ color: '#475569', fontSize: 22 }}>{'‹ 返回'}</Text>
      </TouchableOpacity>

      <Text style={[st.phase, { color: meta.color }]}>{meta.label}</Text>

      <View style={st.ringWrap}>
        <Svg width={300} height={300} style={StyleSheet.absoluteFill}>
          <Circle cx={150} cy={150} r={R} stroke="#1e293b" strokeWidth={STROKE} fill="none" />
          <Circle
            cx={150}
            cy={150}
            r={R}
            stroke={meta.color}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={CIRC * (1 - progress)}
            transform="rotate(-90 150 150)"
          />
        </Svg>
        <Text style={[st.time, { color: phase === 'rest' ? '#d1fae5' : '#f1f5f9' }]}>
          {mm}:{ss}
        </Text>
        <Text style={st.round}>{rounds > 0 ? `今日第 ${rounds} 个番茄` : '保持节奏'}</Text>
      </View>

      <View style={st.ctrlRow}>
        {phase === 'idle' ? (
          <>
            <CircleBtn label="开始专注" color="#fb7185" onPress={() => start('work')} />
            <CircleBtn label="直接休息" color="#34d399" onPress={() => start('rest')} small />
          </>
        ) : (
          <>
            <CircleBtn
              label={running ? '暂停' : '继续'}
              color={running ? '#e2e8f0' : '#4ade80'}
              onPress={() => setRunning(!running)}
            />
            <CircleBtn label="结束" color="#64748b" onPress={reset} small />
          </>
        )}
      </View>

      <TouchableOpacity onPress={() => setShowCfg(!showCfg)}>
        <Text style={st.cfgToggle}>{showCfg ? '收起设置 ▲' : '时长设置 ▼'}</Text>
      </TouchableOpacity>
      {showCfg && (
        <View style={st.cfg}>
          {[
            { label: '专注', v: workMin, set: setWorkMin, opts: [15, 25, 30, 45, 60] },
            { label: '休息', v: restMin, set: setRestMin, opts: [3, 5, 10, 15, 20] },
          ].map((g) => (
            <View key={g.label} style={st.cfgRow}>
              <Text style={st.cfgLabel}>{g.label}</Text>
              {g.opts.map((o) => (
                <Text
                  key={o}
                  style={[st.cfgOpt, g.v === o && st.cfgOptOn]}
                  onPress={() => {
                    g.set(o);
                    if (phase === 'idle') {
                      setLeftSec(o * 60);
                      totalRef.current = o * 60;
                    }
                  }}>
                  {o}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CircleBtn(props: { label: string; color: string; onPress: () => void; small?: boolean }) {
  const size = props.small ? 64 : 92;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      activeOpacity={0.8}
      style={[st.circleBtn, { width: size, height: size, borderColor: props.color }]}>
      <Text style={[st.circleLabel, { color: props.color }]}>{props.label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', top: 24, left: 18 },
  phase: { fontSize: 16, letterSpacing: 4, fontWeight: '600' },
  ringWrap: { marginTop: 18, alignItems: 'center', justifyContent: 'center', width: 300, height: 300 },
  time: { fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'] },
  round: { color: '#475569', fontSize: 13, marginTop: 2 },
  ctrlRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 26 },
  circleBtn: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111c30',
  },
  circleLabel: { fontSize: 16, fontWeight: '600' },
  cfgToggle: { color: '#475569', fontSize: 13, marginTop: 24 },
  cfg: { marginTop: 10 },
  cfgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  cfgLabel: { color: '#64748b', fontSize: 13, width: 30 },
  cfgOpt: { color: '#94a3b8', fontSize: 15, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#16233c' },
  cfgOptOn: { color: '#fbbf24', fontWeight: '700' },
});

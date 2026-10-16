import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Page, Card, Btn, Row, C } from '../ui';

type Phase = 'work' | 'rest' | 'idle';

const R = 100;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;

export default function Pomodoro({ onBack }: { onBack: () => void }) {
  const [workMin, setWorkMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [phase, setPhase] = useState<Phase>('idle');
  const [leftSec, setLeftSec] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const totalRef = useRef(25 * 60);

  useEffect(() => {
    if (!running || phase === 'idle') return;
    const t = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) {
          Vibration.vibrate([0, 400, 200, 400]);
          if (phase === 'work') {
            setRounds((r) => r + 1);
            setPhase('rest');
            totalRef.current = restMin * 60;
            return restMin * 60;
          } else {
            setPhase('work');
            totalRef.current = workMin * 60;
            return workMin * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase, workMin, restMin]);

  const startWork = () => {
    setPhase('work');
    setLeftSec(workMin * 60);
    totalRef.current = workMin * 60;
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setPhase('idle');
    setLeftSec(workMin * 60);
    totalRef.current = workMin * 60;
  };

  const mm = Math.floor(leftSec / 60);
  const ss = leftSec % 60;
  const progress = phase === 'idle' ? 0 : 1 - leftSec / totalRef.current;
  const accent = phase === 'rest' ? '#16a34a' : phase === 'work' ? '#ef4444' : C.primary;
  const phaseText =
    phase === 'work' ? '🍅 专注中' : phase === 'rest' ? '☕ 休息中' : '准备开始';

  return (
    <Page id="pomodoro" title="番茄钟" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{ width: 232, height: 232, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={232} height={232}>
            {/* 底环 */}
            <Circle cx={116} cy={116} r={R} stroke={C.line} strokeWidth={STROKE} fill="none" />
            {/* 进度环：从顶部顺时针 */}
            <Circle
              cx={116}
              cy={116}
              r={R}
              stroke={accent}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={CIRC * (1 - progress)}
              transform="rotate(-90 116 116)"
            />
          </Svg>
          <View style={st.center}>
            <Text style={st.phase}>{phaseText}</Text>
            <Text style={[st.time, { color: accent }]}>
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </Text>
            <Text style={st.rounds}>已完成 {rounds} 个番茄</Text>
          </View>
        </View>
      </Card>

      <Row>
        {phase === 'idle' ? (
          <Btn text="开始专注" onPress={startWork} />
        ) : running ? (
          <Btn text="暂停" onPress={() => setRunning(false)} />
        ) : (
          <Btn text="继续" onPress={() => setRunning(true)} />
        )}
        <Btn text="重置" onPress={reset} kind="plain" />
      </Row>

      <Card style={{ marginTop: 12 }}>
        <Text style={st.label}>专注时长</Text>
        <Row>
          {[15, 25, 30, 45].map((w) => (
            <Btn
              key={w}
              text={`${w}分`}
              kind={workMin === w ? 'primary' : 'plain'}
              onPress={() => {
                setWorkMin(w);
                if (phase === 'idle') {
                  setLeftSec(w * 60);
                  totalRef.current = w * 60;
                }
              }}
              style={{ flex: 1 }}
            />
          ))}
        </Row>
        <Text style={[st.label, { marginTop: 12 }]}>休息时长</Text>
        <Row>
          {[5, 10, 15, 20].map((r) => (
            <Btn
              key={r}
              text={`${r}分`}
              kind={restMin === r ? 'primary' : 'plain'}
              onPress={() => setRestMin(r)}
              style={{ flex: 1 }}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Text style={st.tip}>
          番茄工作法：专注一段时间 → 短暂休息，循环自动交替，阶段切换会震动提醒。圆环表示当前阶段进度。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center' },
  phase: { fontSize: 14, color: C.sub, marginBottom: 6 },
  time: { fontSize: 46, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rounds: { fontSize: 12, color: C.sub, marginTop: 8 },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

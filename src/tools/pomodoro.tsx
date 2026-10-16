import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { Page, Card, Btn, Row, C } from '../ui';

type Phase = 'work' | 'rest' | 'idle';

const WORK_DEFAULT = 25;
const REST_DEFAULT = 5;

export default function Pomodoro({ onBack }: { onBack: () => void }) {
  const [workMin, setWorkMin] = useState(WORK_DEFAULT);
  const [restMin, setRestMin] = useState(REST_DEFAULT);
  const [phase, setPhase] = useState<Phase>('idle'); // idle / work / rest
  const [leftSec, setLeftSec] = useState(WORK_DEFAULT * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const totalRef = useRef(WORK_DEFAULT * 60);

  useEffect(() => {
    if (!running || phase === 'idle') return;
    const t = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) {
          // 阶段结束
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
  const phaseText =
    phase === 'work' ? '🍅 专注中' : phase === 'rest' ? '☕ 休息中' : '就绪';

  return (
    <Page id="pomodoro" title="番茄钟" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Text style={st.phase}>{phaseText}</Text>
        <Text style={[st.time, { color: phase === 'rest' ? C.ok : C.text }]}>
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </Text>
        <View style={st.barBg}>
          <View
            style={[
              st.bar,
              {
                width: `${Math.round(progress * 100)}%` as `${number}%`,
                backgroundColor: phase === 'rest' ? C.ok : C.primary,
              },
            ]}
          />
        </View>
        <Text style={st.rounds}>已完成 {rounds} 个番茄</Text>
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
        <Text style={st.label}>时长设置（分钟后重置生效）</Text>
        <Row style={{ marginTop: 4 }}>
          {[15, 25, 30, 45].map((w) => (
            <Btn
              key={w}
              text={`${w}`}
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
        <Row style={{ marginTop: 10 }}>
          {[5, 10, 15, 20].map((r) => (
            <Btn
              key={r}
              text={`休${r}`}
              kind={restMin === r ? 'primary' : 'plain'}
              onPress={() => setRestMin(r)}
              style={{ flex: 1 }}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Text style={st.tip}>
          经典番茄工作法：专注 25 分钟 → 休息 5 分钟，一个循环算一个番茄，循环自动交替。阶段切换时会震动提醒。设置行点「25」等切换专注时长，「休5」等切换休息时长。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  phase: { fontSize: 15, color: C.sub, marginBottom: 8 },
  time: { fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  barBg: { height: 8, borderRadius: 4, backgroundColor: C.line, alignSelf: 'stretch', marginTop: 18, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  rounds: { fontSize: 13, color: C.sub, marginTop: 12 },
  label: { fontSize: 13, color: C.sub, marginBottom: 8 },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

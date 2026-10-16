import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Page, Card, C } from '../ui';
import { startAccelerometer } from '../native';

const AREA = 220;

export default function Level({ onBack }: { onBack: () => void }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, flat: false, err: '' });
  const last = useRef(0);

  useEffect(() => {
    const stop = startAccelerometer(60, (v) => {
      if (v.error) {
        setTilt((t) => ({ ...t, err: v.error === 'no-sensor' ? '设备没有加速度计' : '传感器异常' }));
        return;
      }
      // 低通滤波防抖
      const now = Date.now();
      if (now - last.current < 33) return;
      last.current = now;
      const ax = v.x, ay = v.y, az = v.z;
      const pitch = Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);
      const roll = Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI);
      const flat = Math.abs(pitch) < 1.5 && Math.abs(roll) < 1.5;
      setTilt({ x: pitch, y: roll, flat, err: '' });
    });
    return stop;
  }, []);

  const clamp = (deg: number) => Math.max(-30, Math.min(30, deg));
  const dx = (clamp(tilt.x) / 30) * (AREA / 2 - 30);
  const dy = (clamp(tilt.y) / 30) * (AREA / 2 - 30);

  return (
    <Page id="level" title="水平仪" onBack={onBack}>
      <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
        <View style={st.board}>
          <View style={st.ring} />
          <View style={[st.crossH, StyleSheet.absoluteFill as any]} />
          <View style={[st.crossV, StyleSheet.absoluteFill as any]} />
          <View
            style={[
              st.bubble,
              { transform: [{ translateX: dx }, { translateY: dy }] },
              tilt.flat && { backgroundColor: '#22c55e' },
            ]}
          />
          {tilt.err ? <Text style={st.err}>{tilt.err}</Text> : null}
        </View>
        <Text style={[st.readout, tilt.flat && { color: C.ok }]}>
          {tilt.err ? '—' : tilt.flat ? '已水平 ✓' : `横向 ${tilt.y.toFixed(1)}° · 纵向 ${tilt.x.toFixed(1)}°`}
        </Text>
      </Card>
      <Card>
        <Text style={st.tip}>
          把手机平放在被测面上（屏幕朝上），气泡移到中心圆圈且变绿即为水平。数据来自加速度计重力分量，精度约 ±0.5°。
        </Text>
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  board: {
    width: AREA,
    height: AREA,
    borderRadius: AREA / 2,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  crossH: { borderTopWidth: 1, borderTopColor: '#e2e8f0', top: '50%' as any },
  crossV: { borderLeftWidth: 1, borderLeftColor: '#e2e8f0', left: '50%' as any },
  bubble: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3b82f6',
    opacity: 0.9,
  },
  readout: { marginTop: 14, fontSize: 15, fontWeight: '600', color: C.text },
  err: { position: 'absolute', color: C.warn },
  tip: { fontSize: 12, color: C.sub, lineHeight: 18 },
});

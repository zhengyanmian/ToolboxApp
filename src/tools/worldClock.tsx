import React, { useEffect, useState } from 'react';
import { Page, Card, C } from '../ui';
import { View, Text, StyleSheet } from 'react-native';

const ZONES: { city: string; tz: string }[] = [
  { city: '北京', tz: 'Asia/Shanghai' },
  { city: '中国香港', tz: 'Asia/Hong_Kong' },
  { city: '东京', tz: 'Asia/Tokyo' },
  { city: '首尔', tz: 'Asia/Seoul' },
  { city: '新加坡', tz: 'Asia/Singapore' },
  { city: '悉尼', tz: 'Australia/Sydney' },
  { city: '莫斯科', tz: 'Europe/Moscow' },
  { city: '伦敦', tz: 'Europe/London' },
  { city: '巴黎', tz: 'Europe/Paris' },
  { city: '纽约', tz: 'America/New_York' },
  { city: '洛杉矶', tz: 'America/Los_Angeles' },
  { city: '迪拜', tz: 'Asia/Dubai' },
];

function fmt(tz: string, now: Date): { time: string; date: string; diff: string } {
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).format(now);
  // 与北京时差（小时）
  const here = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const bj = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const diffH = Math.round((here.getTime() - bj.getTime()) / 3600000);
  const diff = diffH === 0 ? '同步' : diffH > 0 ? `快 ${diffH} 小时` : `慢 ${-diffH} 小时`;
  return { time, date, diff };
}

export default function WorldClock({ onBack }: { onBack: () => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Page id="worldclock" title="世界时钟" onBack={onBack}>
      {ZONES.map((z) => {
        const { time, date, diff } = fmt(z.tz, now);
        return (
          <Card key={z.tz} style={z.tz === 'Asia/Shanghai' ? { borderWidth: 2, borderColor: C.primary } : undefined}>
            <View style={st.row}>
              <View style={{ flex: 1 }}>
                <Text style={st.city}>{z.city}</Text>
                <Text style={st.date}>{date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.time}>{time}</Text>
                <Text style={st.diff}>{diff}</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </Page>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: 16, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.sub, marginTop: 2 },
  time: { fontSize: 24, fontWeight: '700', color: C.primary, fontVariant: ['tabular-nums'] },
  diff: { fontSize: 11, color: C.sub, marginTop: 2 },
});

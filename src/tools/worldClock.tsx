import React, { useEffect, useState } from 'react';
import { Page, Card, C, dynStyles} from '../ui';
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

// 取某时区在给定时刻的"当日分钟数"（0~1439），与时区偏移无关的同一时刻各时区的
// 分钟差即真实时差；不依赖 toLocaleString 反解析，杜绝 NaN
function minutesInTz(tz: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '0';
  return (parseInt(h, 10) % 24) * 60 + parseInt(m, 10);
}

function fmt(tz: string, now: Date): { time: string; date: string; diff: string } {
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).format(now);
  // 与北京的分钟差，归一到 -720~+719 分钟（含跨日）
  const diffMin = minutesInTz(tz, now) - minutesInTz('Asia/Shanghai', now);
  const norm = ((diffMin + 720 + 1440) % 1440) - 720;
  const absMin = Math.abs(norm);
  const hLabel = Math.floor(absMin / 60);
  const mLabel = absMin % 60;
  const diff =
    norm === 0
      ? '同步'
      : `${norm > 0 ? '快' : '慢'} ${hLabel ? `${hLabel} 小时` : ''}${mLabel ? ` ${mLabel} 分` : ''}`.trim();
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

const st = dynStyles((C) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  city: { fontSize: 16, fontWeight: '600', color: C.text },
  date: { fontSize: 12, color: C.sub, marginTop: 2 },
  time: { fontSize: 24, fontWeight: '700', color: C.primary, fontVariant: ['tabular-nums'] },
  diff: { fontSize: 11, color: C.sub, marginTop: 2 },
}));;

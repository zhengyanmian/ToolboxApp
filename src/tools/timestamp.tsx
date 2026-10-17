import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, Icon, Page, Tap, dynStyles } from '../ui';
import { usePalette } from '../theme';
import { copyText } from '../native';

const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');

function nowSec() {
  return Math.floor(Date.now() / 1000);
}
function fmtFull(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}
function autoDate(v: string) {
  return /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : v;
}
function autoTime(v: string) {
  return /^\d{4}$/.test(v) ? `${v.slice(0, 2)}:${v.slice(2, 4)}` : v;
}
function parseDT(dateStr: string, timeStr: string): number | null {
  const m = (dateStr || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const dd = +m[3];
  let hh = 0;
  let mi = 0;
  let ss = 0;
  const ts = (timeStr || '').trim();
  if (ts) {
    const t = ts.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!t) return null;
    hh = +t[1];
    mi = +t[2];
    ss = t[3] ? +t[3] : 0;
  }
  if (mo < 0 || mo > 11 || dd < 1 || dd > 31 || hh > 23 || mi > 59 || ss > 59) return null;
  const d = new Date(y, mo, dd, hh, mi, ss);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== dd) return null;
  return d.getTime();
}
function ago(ms: number): string {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const body = d ? `${d} 天 ${h} 小时` : h ? `${h} 小时 ${m} 分` : m ? `${m} 分 ${s} 秒` : `${s} 秒`;
  return future ? `还有 ${body}` : `${body}前`;
}

function inputStyle(C: any) {
  return {
    backgroundColor: C.input,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: C.text,
    letterSpacing: 0.4,
  };
}

function Out({ main, sub }: { main: string; sub?: string }) {
  const p = usePalette();
  return (
    <View style={[st.outBox, { backgroundColor: p.primarySoft, borderColor: p.primary + '44' }]}>
      <Text style={[st.outMain, { color: p.isDark ? '#fff' : p.primary }]} selectable>
        {main}
      </Text>
      {sub ? (
        <Text style={[st.outSub, { color: p.isDark ? p.sub : '#475569' }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

export default function Timestamp({ onBack }: { onBack: () => void }) {
  const p = usePalette();
  const n0 = new Date();
  const [cur, setCur] = useState(nowSec());
  const [ts, setTs] = useState(String(nowSec()));
  const [dtDate, setDtDate] = useState(
    `${n0.getFullYear()}-${pad(n0.getMonth() + 1)}-${pad(n0.getDate())}`,
  );
  const [dtTime, setDtTime] = useState(`${pad(n0.getHours())}:${pad(n0.getMinutes())}`);

  // 当前时间戳每秒自走
  useEffect(() => {
    const t = setInterval(() => setCur(nowSec()), 1000);
    return () => clearInterval(t);
  }, []);

  /* 时间戳 → 日期 */
  const raw = ts.trim();
  const n = Number(raw);
  const validTs = raw !== '' && /^-?\d+$/.test(raw) && !isNaN(n);
  const msFromTs = validTs ? (Math.abs(n) > 1e12 ? n : n * 1000) : NaN;
  const tsBad = raw !== '' && !validTs;

  /* 日期 → 时间戳 */
  const msFromDt = parseDT(dtDate, dtTime);

  const copy = (v: string) => copyText(v);

  return (
    <Page id="timestamp" title="时间戳转换" onBack={onBack}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={st.sec}>当前时间戳</Text>
          <Tap
            onPress={() => copy(String(cur))}
            style={[st.miniBtn, { backgroundColor: p.chip, borderColor: p.chipBorder }]}
            hitSlop={6}>
            <Icon name="copy" size={13} color={p.sub} strokeWidth={2} />
            <Text style={[st.miniTxt, { color: p.sub }]}>复制</Text>
          </Tap>
        </View>
        <Text style={[st.big, { color: p.primary }]} selectable>
          {cur}
        </Text>
        <Text style={[st.outLine, { color: p.sub }]}>
          毫秒 {cur * 1000} · {fmtFull(cur * 1000)}
        </Text>
      </Card>

      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <Text style={st.sec}>时间戳 → 日期</Text>
          <Tap
            onPress={() => setTs(String(nowSec()))}
            style={[st.miniBtn, { backgroundColor: p.chip, borderColor: p.chipBorder }]}
            hitSlop={6}>
            <Icon name="clock" size={13} color={p.primary} strokeWidth={2} />
            <Text style={[st.miniTxt, { color: p.primary }]}>用现在</Text>
          </Tap>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[inputStyle(p), { flex: 1 }]}
            value={ts}
            onChangeText={(v) => setTs(v.replace(/[^\d-]/g, ''))}
            placeholder="1729000000"
            placeholderTextColor={p.faint}
            keyboardType="numbers-and-punctuation"
          />
          <Tap
            onPress={() => setTs('')}
            style={[
              st.miniBtn,
              { backgroundColor: p.chip, borderColor: p.chipBorder, paddingHorizontal: 12 },
            ]}
            hitSlop={6}>
            <Icon name="close" size={15} color={p.sub} strokeWidth={2.2} />
          </Tap>
        </View>
        {validTs ? (
          <View style={{ marginTop: 10 }}>
            <Out
              main={fmtFull(msFromTs)}
              sub={`${WD[new Date(msFromTs).getDay()]} · ${ago(msFromTs)} · 识别为${
                Math.abs(n) > 1e12 ? '毫秒' : '秒'
              }`}
            />
          </View>
        ) : tsBad ? (
          <Text style={[st.outLine, { color: p.warn, marginTop: 10 }]}>
            请填纯数字，例如 1729000000
          </Text>
        ) : null}
      </Card>

      <Card>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <Text style={st.sec}>日期 → 时间戳</Text>
          <Tap
            onPress={() => {
              const d = new Date();
              setDtDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
              setDtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
            }}
            style={[st.miniBtn, { backgroundColor: p.chip, borderColor: p.chipBorder }]}
            hitSlop={6}>
            <Icon name="clock" size={13} color={p.primary} strokeWidth={2} />
            <Text style={[st.miniTxt, { color: p.primary }]}>用现在</Text>
          </Tap>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[inputStyle(p), { flex: 1.5 }]}
            value={dtDate}
            onChangeText={(v) => setDtDate(autoDate(v))}
            placeholder="2026-10-16"
            placeholderTextColor={p.faint}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <TextInput
            style={[inputStyle(p), { flex: 1 }]}
            value={dtTime}
            onChangeText={(v) => setDtTime(autoTime(v))}
            placeholder="18:30"
            placeholderTextColor={p.faint}
            keyboardType="numbers-and-punctuation"
            maxLength={8}
          />
        </View>
        {msFromDt !== null ? (
          <View style={{ marginTop: 10 }}>
            <Out
              main={`${Math.floor(msFromDt / 1000)} 秒`}
              sub={`毫秒 ${msFromDt} · ${WD[new Date(msFromDt).getDay()]}`}
            />
            <View style={st.chipWrap}>
              <Chip
                text="复制秒"
                icon="copy"
                onPress={() => copy(String(Math.floor(msFromDt / 1000)))}
              />
              <Chip text="复制毫秒" icon="copy" onPress={() => copy(String(msFromDt))} />
            </View>
          </View>
        ) : (
          <Text style={[st.outLine, { color: p.warn, marginTop: 10 }]}>
            日期格式 2026-10-16（只填 20261016 会自动补好），时间 18:30
          </Text>
        )}
      </Card>
    </Page>
  );
}

const st = dynStyles((C) =>
  StyleSheet.create({
    sec: { fontSize: 15, fontWeight: '600', color: C.text },
    big: { fontSize: 30, fontWeight: '700', marginTop: 6, marginBottom: 4, letterSpacing: 0.5 },
    miniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
    },
    miniTxt: { fontSize: 11.5, fontWeight: '600' },
    outBox: {
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    outMain: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
    outSub: { fontSize: 12, lineHeight: 19, marginTop: 2 },
    outLine: { fontSize: 12.5, lineHeight: 20 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  }),
);
